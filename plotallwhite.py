#get locatioin of each
#average the row
#get line of best fit
from PIL import Image, ImageMath, ImageDraw
import numpy as np
from itertools import product
import math
import cv2


class UnionFind:
    """Union-find data structure. Items must be hashable."""

    def __init__(self):
        """Create a new empty union-find structure."""
        self.weights = {}
        self.parents = {}

    def __getitem__(self, obj):
        """X[item] will return the token object of the set which contains `item`"""

        # check for previously unknown object
        if obj not in self.parents:
            self.parents[obj] = obj 
            self.weights[obj] = 1
            return obj 

        # find path of objects leading to the root
        path = [obj]
        root = self.parents[obj]
        while root != path[-1]:
            path.append(root)
            root = self.parents[root]

        # compress the path and return
        for ancestor in path:
            self.parents[ancestor] = root
        return root

    def union(self, obj1, obj2):
        """Merges sets containing obj1 and obj2."""
        roots = [self[obj1], self[obj2]]
        heavier = max([(self.weights[r],r) for r in roots])[1]
        for r in roots:
            if r != heavier:
                self.weights[heavier] += self.weights[r]
                self.parents[r] = heavier




def groupTPL(TPL, distance=1):
    U = UnionFind()

    for (i, x) in enumerate(TPL):
        for j in range(i + 1, len(TPL)):
            y = TPL[j]
            if max(abs(x[0] - y[0]), abs(x[1] - y[1])) <= distance:
                U.union(x, y)

    disjSets = {}
    for x in TPL:
        s = disjSets.get(U[x], set())
        s.add(x)
        disjSets[U[x]] = s

    return [list(x) for x in disjSets.values()]


def distance(x,y, x2, y2):
    return math.sqrt((x - x2)**2 + (y - y2)**2)
#filename = input("name of file")
counter = 0
r = 0
g = 0
b = 0
alpha = 0
im = Image.open("result.jpg")
#NOTE RGB
im = im.convert("RGB")
imagewidth, imageheight = im.size

pixdata = im.load()

# Clean the background noise, if color != white, then set to black.
# change with your color
for y in xrange(im.size[1]):
    whitepixelsinrow = []
    for x in xrange(im.size[0]):
        #either black or white
        if pixdata[x, y] == (255, 255, 255):
            whitepixelsinrow.extend([x])
    #tests
    PASSCRITERIA = int(imagewidth * .005)
    if len(whitepixelsinrow) > PASSCRITERIA:
        #split it up
        potentialworm1 = []
        potentialworm2 = []
        potentialworm3 = []
        potentialworm4 = []
        potentialworm5 = []
        potentialworm6 = []
        potentialworm7 = []
        potentialworm8 = []
        potentialworm9 = []
        potentialworm10 = []
        counter = 1 
        for i in whitepixelsinrow:
            #stops out of index
            if i == whitepixelsinrow[-1]:
                pass
            #continue with test
            else:
                #look for break
                j = whitepixelsinrow.index(i)
                if abs(whitepixelsinrow[j] - whitepixelsinrow[j+1]) > 10:
                    #now we create new worm
                    counter = counter + 1
                else:
                    #now we convert counter to string and add that
                    globals()['potentialworm' + str(counter)].extend([i])
        #now time to calc
        for p in range(1, counter+1):
            arrayname = globals()['potentialworm' + str(p)]
            if len(arrayname) != 0:
                averagepointinrow = float(sum(arrayname)) / float(len(arrayname))
                #averagepointinrow = int(np.mean(arrayname))
                intaveragepointinrow = int(averagepointinrow)
                pixdata[intaveragepointinrow, y] = (255, 0, 0)
            





#NOTE RGB
     

pixdata = im.load()
#OPEN CV TIME




countofred = 0
redX = []
redY = []

draw = ImageDraw.Draw(im)
for y in xrange(im.size[1]):
    for x in xrange(im.size[0]):
        if pixdata[x, y] == (255, 0, 0):
            countofred = countofred + 1
            redX.extend([x])
            redY.extend([y])

#we have the reds organized by row
#combine the lists
redpoints = []

redpoints = zip(redX,redY)
    





#now run grouping algorithm
DISTANCEBETWEENPOINTS = int(imagewidth * .034)
DISTANCETOMOVETOTEXT = int(imagewidth * .07)

returnworms = []

returnworms = groupTPL(redpoints, 10)
refinedworms = []
for i in returnworms:
    if len(i) < 5:
        pass
    else:
        refinedworms.extend([i])


#we nnow have list of worms in refined worms

im.save("resultthree.jpg")
img_rgb = cv2.imread("resultthree.jpg")
#create polynomial functions
finalcountofworms = 0
for i in refinedworms:
    #working with data points now we have x and y below
    lengthofworm = 0.0
    LENGTHOFLIST = len(i)
    ixcor = [x for x,y in i]
    iycor = [y for x,y in i]
    minX = min(ixcor)
    maxX = max(ixcor)
    minY = min(iycor)
    maxY = max(iycor)
    averagey = (minY +  maxY)/2
    averagex = (minX +  maxX)/2
    i = (sorted(i))
    
    linecounter = 0
    lastxvalue = 0
    lastyvalue = 0
    for k in i:
        if linecounter == 0:
            lastxvalue = k[0]
            lastyvalue = k[1]
        else:
            currentxvalue = k[0]
            currentyvalue = k[1]
            localdistance = distance(lastxvalue, lastyvalue, currentxvalue, currentyvalue)
            lengthofworm = lengthofworm + localdistance
            lastxvalue = currentxvalue
            lastyvalue = currentyvalue
            cv2.line(img_rgb, (lastxvalue, lastyvalue), (currentxvalue, currentyvalue), (0,0,255), 3)
        linecounter = linecounter + 1
    roundedlengthofworm = int(lengthofworm)
   
    if roundedlengthofworm < int(imagewidth * .09):
        pass
    else:
        cv2.putText(img_rgb, str(roundedlengthofworm), (averagex+DISTANCETOMOVETOTEXT,averagey), cv2.FONT_HERSHEY_SIMPLEX, 1, 255)
        finalcountofworms = finalcountofworms + 1
cv2.putText(img_rgb, "Worm Count: " + str(finalcountofworms), (imagewidth/2,imageheight), cv2.FONT_HERSHEY_SIMPLEX, 1, 255)
    
    
    
cv2.imwrite('annoted.jpg',img_rgb)     

"""
xpoints = np.array(ixcor)
    ypoints = np.array(iycor)
    if LENGTHOFLIST > 10:
        LENGTHOFLIST = 11
    line = np.polyfit(xpoints, ypoints, 3)
    #we now have the polynomial
    p = np.poly1d(line)
    #now we can just plug in values
    linecounter = 0
    lastvalue = 0.0
    lastkvalue = 0.0
    for k in np.arange(minX, maxX, .1):
        if linecounter == 0:
            lastvalue = p(k)
            lastkvalue = k
        else:
            currentvalue = p(k)
            currentkvalue = k
            localdistance = distance(currentkvalue, currentvalue, lastkvalue, lastvalue)
            lengthofworm = lengthofworm + localdistance
            pixdata[currentkvalue, currentvalue] = (0, 255, 0)
            lastvalue = currentvalue
            lastkvalue = currentkvalue
        linecounter = linecounter + 1

        """







