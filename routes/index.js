var express = require("express");
var router = express.Router();
var fs = require('fs');
var Caman = require('caman').Caman;
var Jimp = require("jimp");
var cv = require("opencv");
var multer  =   require('multer');


//generate unique token for the session
var session_token = getRandomInt(1, 10000000).toString();

//declared to pass data to analysis
var image_width;
var image_height;
var worm_array;

var storage =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './public/uploads');
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + '-' + session_token + ".png");
  }
});

var upload = multer({ storage : storage}).single('photo');


router.get("/", function(req,res) {
    res.render("index");
    
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
        //console.log("photo-" + session_token + ".png");
        var area_percent = req.body.area_percent;

        initial_process();
        while(!fileExists("./public/uploads/" + "output-" + session_token + ".png")) {require('deasync').sleep(1000);}
        processWorms();
        while(!fileExists("./public/uploads/" + "processed-" + session_token + ".png")) {require('deasync').sleep(1000);}
        find_contours(area_percent);
        
        res.redirect("/analyze/" + session_token);
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


router.get("/video", function(req,res) {
    res.render("video_analyze");
});

router.post("/video", function(req,res) {
    
});











function initial_process() {
    
    Caman("./public/uploads/" + "photo-" + session_token + ".png", function () {
                this.contrast(65);
                this.hue(100);
                this.vibrance(100);
                this.greyscale();
                this.render(function () {
                    this.save("./public/uploads/" + "output-" + session_token + ".png");
                });
            });
    
}

function processWorms() {
    
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

        for (var i = 0; i<20; i++) {
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

function find_contours(area_percent) {
    

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
