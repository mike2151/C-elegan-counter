import cv2
import numpy as np
from matplotlib import pyplot as plt
from PIL import Image
import math

#red represents the full grown stage
#green represents under going division
#for Green, we just go with a counter
#blue, yellow will also be used for development

#we need way to now connect reds
#we will use 10 for now. Subject to change
c_elegan_count = 0
close = True
counter = 0
lastx = 0
lasty = 0
originalx = 0
originaly = 0
arrayoflengths = []
beginning = 0
beginning2 = 0
GOAGAIN = True
GOAGAIN2 = True

def distance(x1, x2, y1, y2):
    return math.sqrt((x2 - x1)**2 + (y2 - y1)**2)


imagefile = input("file name")
sizeofimage = input("Size Of View (mm)")
im=Image.open(imagefile)
imagesize = im.size
img_rgb = cv2.imread(imagefile)
img_gray = cv2.cvtColor(img_rgb, cv2.COLOR_BGR2GRAY)
#add templateX
template = cv2.imread('guy1.jpg',0)
template2 = cv2.imread('guy2.jpg',0)
template3 = cv2.imread('guy3.jpg',0)
#add wX, hX
w, h = template.shape[::-1]
w2, h2 = template2.shape[::-1]
w3, h3 = template3.shape[::-1]
#add resX = cv2.matchTemplate(img_gray,template3,cv2.TM_CCOEFF_NORMED)
res = cv2.matchTemplate(img_gray,template,cv2.TM_CCOEFF_NORMED)
res2 = cv2.matchTemplate(img_gray,template2,cv2.TM_CCOEFF_NORMED)
res3 = cv2.matchTemplate(img_gray,template3,cv2.TM_CCOEFF_NORMED)

threshold = 0.9
#create loc
loc = np.where( res >= threshold)

for pt in zip(*loc[::-1]):

    distancebetweenpoints = distance(pt[0], pt[1], pt[0] + w, pt[1] + h)
    
    Xone = pt[0] + w
    Yone = pt[1]
    
    cv2.line(img_rgb, (Xone, Yone), (pt[0], pt[1] + h), (0,0,255), 1)
    
    if counter == 0:
        lastx = pt[0] 
        
        lasty = pt[1]
        
        
    else:
        difference = pt[0] - lastx
        differencey = pt[1] - lasty
        

        #if within in 10
        if difference <= 10 and difference >= -10:
            close = True
         
        else:
            close = False
        if close == False:
            #if whithin 10
            if differencey <= 10 and differencey >= -10:
                close = True
            else:
                close = False
    if close == False:
        #the points were more than 10 units apart
        c_elegan_count += 1
        
        #done testing
        counter = 0
       
    lastx = pt[0]
    lasty = pt[1] 
    counter += 1
 
loc2 = np.where( res2 >= threshold)
for pt2 in zip(*loc2[::-1]):
     
    distancebetweenpoints = distance(pt2[0], pt2[1], pt2[0] + w, pt2[1] + h)
    
    Xone = pt2[0] + w
    Yone = pt2[1]
    
    cv2.line(img_rgb, (Xone, Yone), (pt2[0], pt2[1] + h), (0,0,255), 1)
   
    if counter == 0:
        lastx = pt2[0]
      # originalx = pt[0] + w
        lasty = pt2[1]
      #  originaly = pt[1] + h
        
      
    else:
        difference = pt2[0] - lastx
        differencey = pt2[1] - lasty

        if difference <= 10 and difference >= -10:
            close = True
    
        else:
            close = False
        if close == False:
            if differencey <= 10 and differencey >= -10:
                close = True
            else:
                close = False
    if close == False:
        c_elegan_count += 1
               #done testing
        counter = 0
  
    lastx = pt2[0]
    lasty = pt2[1]     
    counter += 1




cv2.imwrite('res.png',img_rgb)
print("Size of image:")
print(imagesize)
print("count: " + str(c_elegan_count))

