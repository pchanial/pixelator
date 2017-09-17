var layer = document.getElementById("layer1");

var SvgTools = {
    toPathString: function(arr) {
        return arr.map(function (point) {
            return point.join(",")
        }).join(" ");
    },

    addPath: function(path, id, origin) {
        var element = document.createElement("path");
        element.setAttribute("style", "fill:none;stroke:#ff0000;stroke-width:0.05mm");
        element.setAttribute("id", id);
        element.setAttribute("transform", "translate(" + origin[0] + "," + origin[1] + ")");
        element.setAttribute("d", "m " + this.toPathString(path) + " z");
        layer.appendChild(element);
    },

    addRect: function(rect, id, origin) {
        var element = document.createElement("rect");
        element.setAttribute("style", "fill:none;stroke:#ff0000;stroke-width:0.05mm");
        element.setAttribute("id", id);
        element.setAttribute("transform", "translate(" + origin[0] + "," + origin[1] + ")");
        element.setAttribute("x", rect[0]);
        element.setAttribute("y", rect[1]);
        element.setAttribute("width", rect[2]);
        element.setAttribute("height", rect[3]);
        layer.appendChild(element);
    },

    addRects: function(rects, id, origin) {
        for (var [irect, rect] of rects.entries())
            this.addRect(rect, id + "_" + irect, origin);
    },

    clearPathAndLink: function () {
        var out = document.getElementById("out");
        out.innerHTML = "Chargement...";
        layer.innerHTML = "";
    },

    downloadLink: function () {
        var aFileParts = ['<?xml version="1.0" encoding="UTF-8" standalone="no"?>', document.getElementById("svg").innerHTML];
        var oMyBlob = new Blob(aFileParts, { type: "image/svg+xml " });
        var out = document.getElementById("out");
        out.innerHTML = "";
        var link = document.createElement("a");
        link.innerHTML = (["⎘ Télécharger le fichier pour une boite de", box.length, "x", box.width, "x", box.depth, "en", box.thickness, "mm d'epaisseur"].join(" "));
        link.setAttribute("href", URL.createObjectURL(oMyBlob));
        link.setAttribute("download", "box_" + box.length + "x" + box.width + "x" + box.depth + "_" + box.thickness + "mm_" + box.nrows + "x" + box.ncols + ".svg");
        out.appendChild(link);
        link.click();
    },

    setDocumentSize: function () {
        boxElement = document.getElementById("box");
        var [width, height] = box.dimensionsAll;
        boxElement.setAttribute("height", height + "mm");
        boxElement.setAttribute("width", width + "mm");
        boxElement.setAttribute("viewBox", "0 0 " + width + " " + height);
    }
}

var box = {
    init: function(length, width, depth, thickness, backlash, nrows) {
        this.length = length;
        this.width = width;
        this.depth = depth;
        this.thickness = thickness;
        this.backlash = backlash;
        cellWidth = (width - (nrows + 1) * thickness) / nrows;
        if (cellWidth <= 0)
            throw new Error("L'épaisseur de la planche est trop grosse pour le nombre de cases spécifié.");
        this.nrows = nrows;
        this.ncols = Math.round((length - thickness) / (cellWidth + thickness));
        this.cellWidth = cellWidth;
        this.cellLength = (length - (this.ncols + 1) * thickness) / this.ncols;
        this.dimensionsAll = [length, depth * (nrows + this.ncols + 2)];
    },

    femaleEdge: function() {
        return [[0, -this.thickness], [this.depth/4, 0], [0, this.thickness], [this.depth/2, 0], [0, -this.thickness], [this.depth/4, 0], [0, this.thickness]];
    },

    maleEdge: function() {
        return [[this.depth/4, 0], [0, -this.thickness], [this.depth/2, 0], [0, this.thickness], [this.depth/4, 0]];
    },

    straightEdge: function() {
        return [[this.size() - 2 * this.thickness, 0]];
    },

    notchEdge: function() {
        var path = [];
        for (var icell = 0; icell < this.ncells() - 1; icell++)
            path.push([this.cellSize(), 0], [0, this.depth/2], [this.thickness, 0], [0, -this.depth/2]);
        path.push([this.cellSize(), 0]);
        return path;
    },

    path: function() {
        var path = [];
        for (var [rotation, edge] of this.edges().entries())
            path.push(this.rotate(edge.call(this), rotation));
        return [].concat(...path);
    },

    holes: function() {
        if (!this.hasHoles)
            return [];
        var rects = [];
        for (var ihole=0; ihole < this.ncells() - 1; ihole++) {
            rects.push([this.cellSize() + ihole * (this.cellSize() + this.thickness), this.depth / 4, this.thickness, this.depth / 2]);
        }
        return rects;
    },

    rotate: function (points, direction) {
        if (direction == 0)
            return points;
        var f;
        if (direction == 1)
            f = function(point) { return [-point[1],  point[0]] }
        else if (direction == 2)
            f = function(point) { return [-point[0], -point[1]] }
        else if (direction == 3)
            f = function(point) { return [ point[1], -point[0]] }
        else
            throw new Error("Rotation invalide.");
        return points.map(f);
    }

}

var sideLength = Object.create(box);
sideLength.name = "sidelength";
sideLength.size = function() { return this.length };
sideLength.cellSize = function() { return this.cellLength };
sideLength.ncells = function() { return this.ncols };
sideLength.edges = function() {
    return [this.straightEdge, this.femaleEdge, this.straightEdge,
            this.femaleEdge] };
sideLength.hasHoles = true;
sideLength.dimension = function() { return [this.length, this.depth] };
sideLength.ncopies = function() { return 2 };

var sideWidth = Object.create(box);
sideWidth.name = "sidewidth";
sideWidth.size = function() { return this.width };
sideWidth.cellSize = function() { return this.cellWidth };
sideWidth.ncells = function() { return this.nrows };
sideWidth.edges = function() {
    return [this.straightEdge, this.maleEdge, this.straightEdge,
            this.maleEdge] };
sideWidth.hasHoles = true;
sideWidth.dimension = function() { return [this.width, this.depth] };
sideWidth.ncopies = function() { return 2 };

var insideLength = Object.create(sideLength);
insideLength.name = "insidelength";
insideLength.edges = function() {
    return [this.notchEdge, this.maleEdge, this.straightEdge, this.maleEdge] };
insideLength.hasHoles = false;
insideLength.ncopies = function() { return this.nrows - 1 };

var insideWidth = Object.create(sideWidth);
insideWidth.name = "insidewidth";
insideWidth.edges = function() {
    return [this.straightEdge, this.maleEdge, this.notchEdge, this.maleEdge] };
insideWidth.hasHoles = false;
insideWidth.ncopies = function() { return this.ncols - 1 };


function value_of(id) {
    var raw = document.getElementById(id).value;
    var v = parseFloat(raw);
    if (isNaN(v))
        throw new Error(id + " is not a number : " + raw);
    return v;
}

function generate_box() {
    try {
        box.init(value_of("length"),
                 value_of("width"),
                 value_of("depth"),
                 value_of("thickness"),
                 value_of("backlash"),
                 value_of("nrows"));
        var origin = [box.thickness, 0];
        SvgTools.clearPathAndLink();
        for (var piece of [sideLength, insideLength, sideWidth, insideWidth]) {
            path = piece.path();
            rects = piece.holes();
            console.log(piece.name + ": " + rects.length);
            for (var i = 0; i < piece.ncopies(); i++) {
                SvgTools.addPath(path, piece.name + i, origin);
                SvgTools.addRects(rects, piece.name + "hole" + i, origin);
                origin[1] += piece.dimension()[1];
            }
        }
        SvgTools.setDocumentSize();
        SvgTools.downloadLink();
    } catch (e) {
        document.getElementById("out").innerHTML = "";
        alert("Impossible de générer la boite demandée: " + e.message);

    }
}
