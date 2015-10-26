from PIL import Image, ImageMath
from PIL import ImageEnhance
#filename = input("name of file")
counter = 0
r = 0
g = 0
b = 0
alpha = 0
im = Image.open("Image527.jpeg")

im = im.convert("RGBA")
imagewidth, imageheight = im.size

pixdata = im.load()

# Clean the background noise, if color != white, then set to black.
# change with your color
for y in xrange(im.size[1]):
    for x in xrange(im.size[0]):
        if pixdata[x, y] == (255, 255, 255, 255):
            pixdata[x, y] = (0, 0, 0, 255)
        if pixdata[x, y] == (209, 211, 210, 255):
            pixdata[x, y] = (0, 0, 0, 255)
        if pixdata[x, y] == (230, 223, 217, 255):
            pixdata[x, y] = (0, 0, 0, 255)
        if pixdata[x, y] == (216, 210, 198, 255):
            pixdata[x, y] = (0, 0, 0, 255)
        if pixdata[x, y] == (210, 216, 232, 255):
            pixdata[x, y] = (0, 0, 0, 255)
        if pixdata[x, y] == (173, 173, 173, 255):
            pixdata[x, y] = (0, 0, 0, 255)
        if pixdata[x, y] == (197, 187, 185, 255):
            pixdata[x, y] = (0, 0, 0, 255)
        if counter == 0:
            pass
        else:
            r, g, b, alpha = im.getpixel((x, y))
            
            rtest = abs(r - lastvalueR) <= 30
            gtest = abs(g - lastvalueG) <= 30
            btest = abs(b - lastvalueB) <= 30
            #if these are all similar
            RtoBtest = abs(r - b) <= 10
            RtoGtest = abs(r - g) <= 10
            BtoGtest = abs(g - b) <= 10
            if RtoBtest == True and RtoGtest == True and BtoGtest == True:  
                if rtest == True and gtest == True and btest == True:
                    pixdata[x, y] = (0, 0, 0, 255)
            
    
        
            
        lastvalueR = r
        lastvalueG = g 
        lastvalueB = b
        counter = counter + 1
    counter = 0

            
enh = ImageEnhance.Contrast(im)
im = enh.enhance(1.9)

#if surrounding are black, elimate 
pixdata = im.load()

# Clean the background noise, if color != white, then set to black.
# change with your color



im = im.point(lambda p: p * 1.4)
pixdata = im.load()
for y in xrange(im.size[1]):
            for x in xrange(im.size[0]):
                if pixdata[x, y] == (255, 255, 255, 255):
                    pixdata[x, y] = (0, 0, 0, 255)
                if pixdata[x, y] == (253, 253, 253, 255):
                    pixdata[x, y] = (0, 0, 0, 255)
                if pixdata[x, y] == (249, 249, 249, 255):
                    pixdata[x, y] = (0, 0, 0, 255)
                if pixdata[x, y] == (250, 250, 250, 255):
                    pixdata[x, y] = (0, 0, 0, 255)
                if pixdata[x, y] == (251, 251, 251, 255):
                    pixdata[x, y] = (0, 0, 0, 255)
                if pixdata[x, y] == (252, 252, 252, 255):
                    pixdata[x, y] = (0, 0, 0, 255)
                if pixdata[x, y] == (254, 254, 254, 255):
                    pixdata[x, y] = (0, 0, 0, 255)
                if pixdata[x, y] == (250, 251, 255, 255):
                    pixdata[x, y] = (0, 0, 0, 255)
                if pixdata[x, y] == (247, 253, 251, 255):
                    pixdata[x, y] = (0, 0, 0, 255)
                if pixdata[x, y] == (253, 244, 248, 255):
                    pixdata[x, y] = (0, 0, 0, 255)
pixdata = im.load()   

#now do pixel screening
for y in xrange(im.size[1]):
    for x in xrange(im.size[0]):
        if counter == 0 or counter == imagewidth - 1:
            pass
        else:
            r, g, b, alpha = im.getpixel((x, y))
            rnext, gnext, bnext, alphanext = im.getpixel((x+1, y))
            if b != 0 and g != 0 and r != 0:
                if lastvalueR == 0 and lastvalueG == 0 and lastvalueB == 0:
                    if rnext == 0 and gnext == 0 and bnext == 0:
                        pixdata[x, y] = (0, 0, 0, 255)
                    
           
            
        lastvalueR = r
        lastvalueG = g 
        lastvalueB = b
        counter = counter + 1
    counter = 0

im = im.convert('1')
im.show()
im.save("result.jpg")
