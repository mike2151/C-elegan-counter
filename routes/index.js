var express = require("express");
var router = express.Router();
var fs = require('fs');
var Caman = require('caman').Caman;
var Jimp = require("jimp");
var cv = require("opencv");
var multer  =   require('multer');
var ffmpeg = require('fluent-ffmpeg');
var fse = require('fs-extra');

//generate unique token for the session
var session_token = getRandomInt(1, 10000000).toString();

//declared to pass data to analysis
var image_width;
var image_height;
var worm_array;
var velocity_array;
var im1w, im1h, im2w, im2h;
var velocities = [];
var global_image_one_positions = [];
var global_image_two_positions = [];

var storage =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './public/uploads');
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + '-' + session_token + ".png");
  }
});

var storage_vid =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './public/uploads');
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + '-' + session_token + ".mp4");
  }
});

var upload = multer({ storage : storage}).single('photo');
var upload_vid = multer({ storage : storage_vid}).single('video');


router.get("/", function(req,res) {
    res.render("index");
    //count objects and delete if folder is too big (over 100 items)
    var item_count = 0;
    fse.walk('./public/uploads')
    .on('data', function (item) {
        item_count = item_count + 1;
    })
    .on('end', function () {
        if (item_count > 50) {
            fse.emptyDirSync('./public/uploads');
            fs.closeSync(fs.openSync('./public/uploads/.keep', 'w'));
        }
    });

    
    


});

router.get("/about", function(req,res) {
    res.render("about");
});

router.get("/analyze", function(req,res) {
    res.render("analyze");
});

router.get("/measure", function(req,res) {
    res.render("draw");
});


router.post("/analyze", function(req,res) {
    upload(req,res,function(err) {
        if(err) {
            res.redirect("/analyze");
        }
        var area_percent = parseFloat(req.body.area_percent);
        var contrast = parseInt(req.body.contrast);
        var hue = parseInt(req.body.hue);
        var vibrance = parseInt(req.body.vibrance);
        var noise = parseInt(req.body.noise);

        initial_process(session_token, contrast, hue, vibrance);
        while(!fileExists("./public/uploads/" + "output-" + session_token + ".png")) {require('deasync').sleep(1000);}
        processWorms(session_token, noise);
        while(!fileExists("./public/uploads/" + "processed-" + session_token + ".png")) {require('deasync').sleep(1000);}
        find_contours(session_token, area_percent);
        
        res.redirect("/analyze/" + session_token);
    });
});

router.post("/config", function(req,res) {
    upload(req,res,function(err) {
        if(err) {
            res.redirect("/config");
        }
        var area_percent = parseFloat(req.body.area_percent);
        var contrast = parseInt(req.body.contrast);
        var hue = parseInt(req.body.hue);
        var vibrance = parseInt(req.body.vibrance);
        var noise = parseInt(req.body.noise);
        
        initial_process(session_token, contrast, hue, vibrance);
        while(!fileExists("./public/uploads/" + "output-" + session_token + ".png")) {require('deasync').sleep(1000);}
        processWorms(session_token, noise);
        while(!fileExists("./public/uploads/" + "processed-" + session_token + ".png")) {require('deasync').sleep(1000);}
        find_contours(session_token, area_percent);
        
        res.redirect("/analyze_config/" + session_token + "/" + contrast + "/" + hue + "/" + vibrance + "/" + noise);
    });
});


router.get("/analyze/:token", function(req,res) {
    var token = req.params.token;
    if (fileExists("./public/uploads/" + "photo-" + token + ".png")){fs.unlinkSync("./public/uploads/" + "photo-" + token + ".png");}
    if (fileExists("./public/uploads/" + "output-" + token + ".png")){fs.unlinkSync("./public/uploads/" + "output-" + token + ".png");}
    if (fileExists("./public/uploads/" + "processed-" + token + ".png")){fs.unlinkSync("./public/uploads/" + "processed-" + token + ".png");}

    var image_link = ("../uploads/" + "worms-" + token + ".png");

    res.render("analyze_image", {image_link: image_link, image_width: image_width, image_height: image_height, worm_array: worm_array});
});

router.get("/analyze_config/:token/:contrast/:hue/:vib/:noise", function(req,res) {
    var token = req.params.token;
    var contrast = req.params.contrast;
    var hue = req.params.hue;
    var vib = req.params.vib;
    var noise = req.params.noise;
    
    if (fileExists("./public/uploads/" + "photo-" + token + ".png")){fs.unlinkSync("./public/uploads/" + "photo-" + token + ".png");}
    if (fileExists("./public/uploads/" + "output-" + token + ".png")){fs.unlinkSync("./public/uploads/" + "output-" + token + ".png");}
    if (fileExists("./public/uploads/" + "processed-" + token + ".png")){fs.unlinkSync("./public/uploads/" + "processed-" + token + ".png");}

    var image_link = ("../../../../../uploads/" + "worms-" + token + ".png");

    res.render("analyze_image_config", {image_link: image_link, image_width: image_width, image_height: image_height, worm_array: worm_array, hue: hue, contrast: contrast, vib: vib, noise: noise});
});


router.get("/video", function(req,res) {
    res.render("video_analyze");
});

router.post("/video", function(req,res) {
    upload_vid(req,res,function(err) {
        if(err) {
            res.redirect("/video_analyze");
        }
        res.redirect("/video_analyze/" + session_token);
    });
});

router.get("/video_analyze/:token", function(req,res) {
    var token = req.params.token;
    var video_path = ("../uploads/" + "video-" + token + ".mp4");
    res.render("analyze_single_video", {video_path: video_path, token: token});
});

router.post("/video_analyze/:token", function(req,res) {
    var token = req.params.token;
    var time_point = req.body.time;

    var contrast = parseInt(req.body.contrast);
    var hue = parseInt(req.body.hue);
    var vibrance = parseInt(req.body.vibrance);
    var noise = parseInt(req.body.noise);

    var area_percent_image = parseFloat(req.body.areapercent);
    var new_session_token = getRandomInt(1,1000000000).toString();
    var proc = new ffmpeg("./public/uploads/" + "video-" + token + ".mp4")
    .takeScreenshots({
        count: 1,
        filename: "photo-" + new_session_token,
        timemarks: [time_point ] // number of seconds
        }, "./public/uploads/", function(err) {
  });
        while(!fileExists("./public/uploads/" + "photo-" + new_session_token + ".png")) {require('deasync').sleep(1000);}
        initial_process(new_session_token, contrast, hue, vibrance);
        while(!fileExists("./public/uploads/" + "output-" + new_session_token + ".png")) {require('deasync').sleep(1000);}
        processWorms(new_session_token, noise);
        while(!fileExists("./public/uploads/" + "processed-" + new_session_token + ".png")) {require('deasync').sleep(1000);}
        find_contours(new_session_token,area_percent_image);
        
        res.redirect("/analyze/" + new_session_token);
});

router.post("/video_velocity/:token", function(req,res) {
    var token = req.params.token;
    var start_time = req.body.start_time;
    var end_time = req.body.end_time;
    var time_between = end_time - start_time;

    var contrast = parseInt(req.body.contrast_v);
    var hue = parseInt(req.body.hue_v);
    var vibrance = parseInt(req.body.vibrance_v);
    var noise = parseInt(req.body.noise_v);

    var area_percent_image = parseFloat(req.body.areapercent_velocity);
    var new_session_token = getRandomInt(1,1000000000).toString();
    var second_new_sessions_token = getRandomInt(1,1000000000).toString();
    var proc = new ffmpeg("./public/uploads/" + "video-" + token + ".mp4")
    .takeScreenshots({
        count: 1,
        filename: "photo-" + new_session_token,
        timemarks: [start_time ] // number of seconds
        }, "./public/uploads/", function(err) {
  });
  var proc_two = new ffmpeg("./public/uploads/" + "video-" + token + ".mp4")
    .takeScreenshots({
        count: 1,
        filename: "photo-" + second_new_sessions_token,
        timemarks: [end_time ] // number of seconds
        }, "./public/uploads/", function(err) {
  });

  //two images now created
        while(!fileExists("./public/uploads/" + "photo-" + new_session_token + ".png") && !fileExists("./public/uploads/" + "photo-" + second_new_sessions_token + ".png")) {require('deasync').sleep(1000);}
        initial_process(new_session_token, contrast, hue, vibrance);
        initial_process(second_new_sessions_token, contrast, hue, vibrance);
        while(!fileExists("./public/uploads/" + "output-" + new_session_token + ".png") && !fileExists("./public/uploads/" + "output-" + second_new_sessions_token + ".png")) {require('deasync').sleep(1000);}
        processWorms(new_session_token, noise);
        processWorms(second_new_sessions_token, noise);
        while(!fileExists("./public/uploads/" + "processed-" + new_session_token + ".png") && !fileExists("./public/uploads/" + "processed-" + second_new_sessions_token + ".png")) {require('deasync').sleep(1000);}
        //two files are now created.
        
        get_velocity(new_session_token, second_new_sessions_token, time_between, area_percent_image);
        var image_one_link = ("../uploads/" + "worms-" + new_session_token + ".png");
        var image_two_link = ("../uploads/" + "worms-" + second_new_sessions_token + ".png");
        var time_var = start_time.toString() + " - " + end_time.toString() + " seconds";
        res.render("velocities", {image_one_link: image_one_link, image_two_link: image_two_link, image_one_width: im1w, image_one_height: im1h, image_two_width: im2w, image_two_height: im2h, velocities: velocities, image_one_positions: global_image_one_positions, image_two_positions: global_image_two_positions, time_var: time_var});
        while(!fileExists("./public/uploads/" + "worms-" + new_session_token + ".png") && !fileExists("./public/uploads/" + "worms-" + second_new_sessions_token + ".png")) {require('deasync').sleep(1000);}
        //delete old files to keep room
        fs.unlinkSync("./public/uploads/" + "photo-" + new_session_token + ".png");
        fs.unlinkSync("./public/uploads/" + "photo-" + second_new_sessions_token + ".png");
        fs.unlinkSync("./public/uploads/" + "output-" + new_session_token + ".png");
        fs.unlinkSync("./public/uploads/" + "output-" + second_new_sessions_token + ".png");
        fs.unlinkSync("./public/uploads/" + "processed-" + new_session_token + ".png");
        fs.unlinkSync("./public/uploads/" + "processed-" + second_new_sessions_token + ".png");

});

router.get("/video_velocity/:token", function(req,res) {
    res.redirect("/video");
});

router.get("/config", function(req,res) {
    res.render("config_img");
});













function initial_process(session_token, contrast, hue, vibrance) {
    
    Caman("./public/uploads/" + "photo-" + session_token + ".png", function () {
                this.contrast(contrast);
                this.hue(hue);
                this.vibrance(vibrance);
                this.greyscale();
                this.render(function () {
                    this.save("./public/uploads/" + "output-" + session_token + ".png");
                });
            });
    
}

function processWorms(session_token, noise) {
    
    Jimp.read("./public/uploads/" + "output-" + session_token + ".png").then(function (pic) {
        
        
    pic.scan(0, 0, pic.bitmap.width, pic.bitmap.height, function (x, y, idx) {
             var red   = this.bitmap.data[ idx + 0 ];
             var green = this.bitmap.data[ idx + 1 ];
             var blue  = this.bitmap.data[ idx + 2 ];

            if (red > 210 && blue > 210 && green > 210) {
                        this.bitmap.data[idx] = 255;
                        this.bitmap.data[idx + 1] = 255;
                        this.bitmap.data[idx + 2] = 255;
            }
        });

        for (var i = 0; i<noise; i++) {
        //goes through each pixel
        pic.scan(0, 0, pic.bitmap.width, pic.bitmap.height, function (x, y, idx) {
             var red   = this.bitmap.data[ idx + 0 ];
             var green = this.bitmap.data[ idx + 1 ];
             var blue  = this.bitmap.data[ idx + 2 ];
             
             if (red != 255 && blue != 255 && green != 255) 
             {
                 var bottom_is_white = false;
                 var right_is_white = false;
                 if (y+1 < pic.bitmap.height) {
                     var hex = pic.getPixelColor(x, y+1); 
                     var r, g, b, a = Jimp.intToRGBA(hex);
                     var bottom_is_white = (r == 255 && b == 255 && g == 255);
                 }
             
                 if (x+1 < pic.bitmap.width) {
                    var hex = pic.getPixelColor(x+1, y); 
                    var r, g, b, a = Jimp.intToRGBA(hex);
                    var right_is_white = (r == 255 && b == 255 && g == 255);
                 }

                 


                 if (bottom_is_white || right_is_white) {
                     this.bitmap.data[idx] = 255;
                     this.bitmap.data[idx + 1] = 255;
                     this.bitmap.data[idx + 2] = 255;
                 }
             }

    });
        }
        
         pic.write("./public/uploads/" + "processed-" + session_token + ".png"); // save 
}).catch(function (err) {
    console.error(err);
});

}

function find_contours(session_token, area_percent) {
    

  cv.readImage("./public/uploads/" + "processed-" + session_token + ".png", function(err, im){
      
    if (err) throw err;
    worm_array = [];
    var width = im.width();
    var height = im.height();
    image_width = im.width();
    image_height = im.height();
    var total_area = width*height;
    var maxArea;
    if (!area_percent) {maxArea = 2500;}
    else {
     maxArea = parseFloat(total_area) * area_percent;
    }
   
    var GREEN = [0, 255, 0]; // B, G, R
    var WHITE = [255, 255, 255]; // B, G, R
    var RED   = [0, 0, 255]; // B, G, R
    var YELLOW = [0, 255, 255];

    var worm_contours = [];

    

    var big = new cv.Matrix(height, width);
    var all = new cv.Matrix(height, width);

    im.convertGrayscale();
    var im_canny = im.copy();
    im_canny.canny(0, 100);
    im_canny.dilate(2);

    var contours = im_canny.findContours();

    for(i = 0; i < contours.size(); i++) {
        if(contours.area(i) > maxArea) {


        worm_contours.push(i);
        var moments = contours.moments(i);
        var cgx = Math.round(moments.m10 / moments.m00);
        var cgy = Math.round(moments.m01 / moments.m00);
        big.drawContour(contours, i, GREEN);


        //getting two end poiints of worm
        var greatest_difference = {point_one: [0,0], point_two: [0,0], distance: 0};
        //var d = Math.sqrt( (x2-=x1)*x2 + (y2-=y1)*y2 );
            for(var j = 0; j < contours.cornerCount(i); ++j) {
                var first_point = contours.point(i, j);
                
                for(var k = 0; k < contours.cornerCount(i); ++k ) {
                    var second_point = contours.point(i, k);
                    var temp_distance = Math.sqrt( (first_point.x-second_point.x)*(first_point.x-second_point.x) + (first_point.y-second_point.y)*(first_point.y-second_point.y) );
                    if (temp_distance > greatest_difference.distance) {
                        greatest_difference = {point_one: [first_point.x,first_point.y], point_two: [second_point.x,second_point.y], distance: temp_distance}
                        
                    }
                }
            }

        
        var first_end_point_x = greatest_difference.point_one[0];
        var first_end_point_y = greatest_difference.point_one[1];
        var second_end_point_x = greatest_difference.point_two[0];
        var second_end_point_y = greatest_difference.point_two[1];

        

      big.line([first_end_point_x - 5, first_end_point_y], [first_end_point_x + 5, first_end_point_y], YELLOW);
      big.line([first_end_point_x, first_end_point_y - 5], [first_end_point_x, first_end_point_y + 5], YELLOW);

      big.line([second_end_point_x - 5, second_end_point_y], [second_end_point_x + 5, second_end_point_y], YELLOW);
      big.line([second_end_point_x, second_end_point_y - 5], [second_end_point_x, second_end_point_y + 5], YELLOW);
        
//end of max points


        var array_of_points = contours.boundingRect(i);
        var point1 = [array_of_points["x"], array_of_points["y"]];
        var point2 = [array_of_points["width"], array_of_points["height"]]
        big.rectangle(point1, point2, WHITE);
        

        
        //arclength is the perimeter
        big.putText(worm_contours.length.toString(), cgx, cgy, "HERSEY_COMPLEX_SMALL", RED, 1, 1);

        var array_len = Number((contours.arcLength(i)/2.0).toFixed(1));
        var array_area = Number((contours.area(i)).toFixed(1));
        var array_width = array_of_points["width"];
        var array_height = array_of_points["height"];


        worm_array.push({len: array_len, area: array_area, bounding_width: array_width, bounding_height: array_height});   
        array_of_points = [];
        }
  }



  big.save("./public/uploads/" + "worms-" + session_token + ".png");
});
}



function get_velocity(first_token, second_token, time, area_percent) {

    var image_one_width;
    var image_one_height;
    var image_two_width;
    var image_two_height;
    var image_one_positions = [];
    var image_two_positions = [];
    var velocity_array = [];

    cv.readImage("./public/uploads/" + "processed-" + first_token + ".png", function(err, im){
    if (err) throw err;
    var width = im.width();
    var height = im.height();
    image_one_width = width;
    image_one_height = height;
    var total_area = width*height;
    var maxArea;
    if (!area_percent) {maxArea = 2500;}
    else {
     maxArea = parseFloat(total_area) * area_percent;
    }
    var GREEN = [0, 255, 0]; // B, G, R
    var WHITE = [255, 255, 255]; // B, G, R
    var RED   = [0, 0, 255]; // B, G, R

    var worm_contours = [];
    var big = new cv.Matrix(height, width);

    im.convertGrayscale();
    var im_canny = im.copy();
    im_canny.canny(0, 100);
    im_canny.dilate(2);

    var contours = im_canny.findContours();

    for(i = 0; i < contours.size(); i++) {
    if(contours.area(i) > maxArea) {
      worm_contours.push(i);
      var moments = contours.moments(i);
      var cgx = Math.round(moments.m10 / moments.m00);
      var cgy = Math.round(moments.m01 / moments.m00);
      big.drawContour(contours, i, GREEN);
      var array_of_points = contours.boundingRect(i);
      var point1 = [array_of_points["x"], array_of_points["y"]];
      var point2 = [array_of_points["width"], array_of_points["height"]]
      big.rectangle(point1, point2, WHITE);
      big.putText(worm_contours.length.toString(), cgx, cgy, "HERSEY_COMPLEX_SMALL", RED, 1, 1);

     image_one_positions.push({x: cgx, y: cgy});  
     array_of_points = [];
    }
  }
  big.save("./public/uploads/" + "worms-" + first_token + ".png");
});

    cv.readImage("./public/uploads/" + "processed-" + second_token + ".png", function(err, im){
    if (err) throw err;
    var width = im.width();
    var height = im.height();
    image_two_width = width;
    image_two_height = height;
    var total_area = width*height;
    var maxArea;
    if (!area_percent) {maxArea = 2500;}
    else {
     maxArea = parseFloat(total_area) * area_percent;
    }
    var GREEN = [0, 255, 0]; // B, G, R
    var WHITE = [255, 255, 255]; // B, G, R
    var RED   = [0, 0, 255]; // B, G, R

    var worm_contours = [];
    var big = new cv.Matrix(height, width);

    im.convertGrayscale();
    var im_canny = im.copy();
    im_canny.canny(0, 100);
    im_canny.dilate(2);

    var contours = im_canny.findContours();

    for(i = 0; i < contours.size(); i++) {
    if(contours.area(i) > maxArea) {
      worm_contours.push(i);
      var moments = contours.moments(i);
      var cgx = Math.round(moments.m10 / moments.m00);
      var cgy = Math.round(moments.m01 / moments.m00);
      big.drawContour(contours, i, GREEN);
      var array_of_points = contours.boundingRect(i);
      var point1 = [array_of_points["x"], array_of_points["y"]];
      var point2 = [array_of_points["width"], array_of_points["height"]]
      big.rectangle(point1, point2, WHITE);
      big.putText(worm_contours.length.toString(), cgx, cgy, "HERSEY_COMPLEX_SMALL", RED, 1, 1);

     image_two_positions.push({x: cgx, y: cgy});  
     array_of_points = [];
    }
  }
  big.save("./public/uploads/" + "worms-" + second_token + ".png");
});
//now have two position arrays of points in image_one_positions and image_two_positions
 global_image_one_positions = image_one_positions;
 global_image_two_positions = image_two_positions;
 var length_one = image_one_positions.length;
 var length_two = image_two_positions.length;
 if (length_one > length_two) {
     image_one_positions = image_one_positions.slice(0,length_two-1);
 }
 if (length_one < length_two) {
     image_two_positions = image_two_positions.slice(0,length_one-1);
 }

 //now equal length
 for (var i = 0; i < image_one_positions.length; i++) {
     //check to see if each exits
     if (image_one_positions[i] != null && image_two_positions[i] != null){
         var x1 = image_one_positions[i].x;
        var y1 = image_one_positions[i].y;
        var x2 = image_two_positions[i].x;
        var y2 = image_two_positions[i].y;

        var displacement = Math.sqrt( (x1-x2)*(x1-x2) + (y1-y2)*(y1-y2) );
        var velocity = displacement / time;
        
        velocity_array.push(velocity);
    }
     
 }

 im1w = image_one_width;
 im1h = image_one_height;
 im2w = image_two_width;
 im2h = image_two_height;
 velocities = velocity_array;


}



function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fileExists(filePath)
{
    try
    {
        return fs.statSync(filePath).isFile();
    }
    catch (err)
    {
        return false;
    }
}




module.exports = router;
