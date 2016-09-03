var express = require("express");
var router = express.Router();
var fs = require('fs');
var Caman = require('caman').Caman;
var Jimp = require("jimp");
var cv = require("opencv");


router.get("/", function(req,res) {
    res.render("index");
    Caman("./public/images/main.jpeg", function () {
        this.contrast(65);
        this.hue(100);
        this.vibrance(100);
        this.greyscale();
        //this.exposure(50);
        this.render(function () {
            this.save("./public/images/output.png");
            processWorms();
            find_contours();
  });
});



});

function processWorms() {
    Jimp.read("./public/images/output.png").then(function (pic) {

        
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

         pic.write("./public/images/processed.png"); // save 
}).catch(function (err) {
    console.error(err);
});

}

function find_contours() {

  cv.readImage("./public/images/processed.png", function(err, im){
      
    if (err) throw err;

    var maxArea = 2500;
    var GREEN = [0, 255, 0]; // B, G, R
    var WHITE = [255, 255, 255]; // B, G, R
    var RED   = [0, 0, 255]; // B, G, R

    var worm_contours = [];

    var width = im.width();
    var height = im.height();

    var big = new cv.Matrix(height, width);
    var all = new cv.Matrix(height, width);

    im.convertGrayscale();
    var im_canny = im.copy();
    im_canny.canny(0, 100);
    im_canny.dilate(2);

    var contours = im_canny.findContours();

    for(i = 0; i < contours.size(); i++) {
    if(contours.area(i) > maxArea) {

//see if width and height of box are nearly equal 

      worm_contours.push(i);
      var moments = contours.moments(i);
      var cgx = Math.round(moments.m10 / moments.m00);
      var cgy = Math.round(moments.m01 / moments.m00);
      big.drawContour(contours, i, GREEN);


      var array_of_points = contours.boundingRect(i);
      var point1 = [array_of_points["x"], array_of_points["y"]];
      var point2 = [array_of_points["width"], array_of_points["height"]]
      big.rectangle(point1, point2, WHITE);
      array_of_points = [];

      
      big.putText(worm_contours.length.toString() + ": " + Number((contours.arcLength(i)).toFixed(1)) + "px", cgx, cgy, "HERSEY_COMPLEX_SMALL", RED, 1, 1);
  
    }
  }
/** 
  console.log("size:" + worm_contours.length.toString());
  for (var j = 0; j < worm_contours.length; j++) {
      console.log(contours.area(worm_contours[j], true));
  }
  */
  big.save('./public/images/worms.png');
  
  
});
}




module.exports = router;
