'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let N = 20;                     // splines count
let lightPositionEl;
let lightPos = [0,0,0];
let scalePositionEl;
function deg2rad(angle) {
    return angle * Math.PI / 180;
}

function GetParabolicPoint(X)
{
    let x = X;
    let y = X * X - 2;
    let z = 1;

    return [x,y,z];
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTextureCoordBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices, texCoord) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoord), gl.STREAM_DRAW);
    }

    this.Draw = function() {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureCoordBuffer);
        gl.vertexAttribPointer(shProgram.iTextureCoord, 2 , gl.FLOAT, false, 0 , 0 );
        gl.enableVertexAttribArray(shProgram.iTextureCoord);

        gl.vertexAttribPointer(shProgram.iNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iNormal);

        for (let i = 0; i <= (N + 1) * 2; i++) {
            gl.drawArrays(gl.TRIANGLE_STRIP, i * N, N);
        }
    }
}

// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    // Normals
    this.iNormal = -1;
    this.iNormalMatrix = -1;

    // Ambient, diffuse, specular
    this.iAmbientColor = -1;
    this.iDiffuseColor = -1;
    this.iSpecularColor = -1;
    this.iAmbientCoefficient = -1;
    this.iDiffuseCoefficient = -1;
    this.iSpecularCoefficient = -1;
    // Shininess
    this.iShininess = -1;

    // Light
    this.iLightPos = -1;

    this.iSampler = -1;
    this.iTextureCoord = -1;
    this.iFScale = -1;
    this.iScalePoint = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI/8, 1, 8, 12);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );

    const modelviewInv = m4.inverse(matAccum1, new Float32Array(16));
    const normalMatrix = m4.transpose(modelviewInv, new Float32Array(16));


    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1 );

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );

    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

    let x = Array.from(lightPositionEl.getElementsByTagName('input')).map(el => +el.value)[0];

    lightPos = GetParabolicPoint(x);
    gl.uniform3fv(shProgram.iLightPos, lightPos);

    gl.uniform1f(shProgram.iShininess, 80.0);
    gl.uniform1f(shProgram.iAmbientCoefficient, 1);
    gl.uniform1f(shProgram.iDiffuseCoefficient, 1);
    gl.uniform1f(shProgram.iSpecularCoefficient, 1);

    gl.uniform3fv(shProgram.iAmbientColor, [0.1, 0.6, 0.4]);
    gl.uniform3fv(shProgram.iDiffuseColor, [1, 0.5, 0.5]);
    gl.uniform3fv(shProgram.iSpecularColor, [1.0, 0.0, 1.0]);

    const scaleWorldPosition = Array.from(scalePositionEl.getElementsByTagName('input')).map(el => +el.value);
    let scalePos = [];
    scalePos[0] = deg2rad(scaleWorldPosition[0]) / (2 * Math.PI);
    scalePos[1] = (scaleWorldPosition[1] + 1) / 2;
    gl.uniform2fv(shProgram.iScalePoint, scalePos);
    gl.uniform1i(shProgram.iSampler, 0);
    gl.uniform1f(shProgram.iFScale, 0.8);

    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [0.0,1.0,0.0,1] );
    surface.Draw();
}

function CreateSurfaceData() {
    // KISS Surface
    let vertexList = []
    let stepU = 360 / (N - 1)
    let stepV = 2 / (N - 1)
    for (let u = 0; u < 360; u += stepU) {
        for (let v = -1; v <= 1; v += stepV) {
            let z = v * v * Math.sqrt(1 - v)

            vertexList.push(z * Math.cos(deg2rad(u)), z * Math.sin(deg2rad(u)), v)
            vertexList.push(z * Math.cos(deg2rad(u + stepU)), z * Math.sin(deg2rad(u + stepU)), v)
        }
    }
    return vertexList
}

function createTextureCoordinates(){
    let resultCoordinates = []
    let stepU = 360 / (N - 1)
    let stepV = 2 / (N - 1)
    for (let u = 0; u < 360; u += stepU) {
        for (let v = -1; v <= 1; v += stepV) {
            let z = v * v * Math.sqrt(1 - v)
            resultCoordinates.push(deg2rad(u) / (2 * Math.PI), (v + 1) / 2)
            resultCoordinates.push(deg2rad(u + stepU)  / (2 * Math.PI), (v + 1) / 2)
        }
    }
    return resultCoordinates
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor                     = gl.getUniformLocation(prog, "color");
    shProgram.iTextureCoord              = gl.getAttribLocation(prog, 'textureCoord')
    shProgram.iNormal                    = gl.getAttribLocation(prog, 'normal');
    shProgram.iNormalMatrix              = gl.getUniformLocation(prog, 'normalMat');

    shProgram.iAmbientColor              = gl.getUniformLocation(prog, 'ambientColor');
    shProgram.iDiffuseColor              = gl.getUniformLocation(prog, 'diffuseColor');
    shProgram.iSpecularColor             = gl.getUniformLocation(prog, 'specularColor');

    shProgram.iShininess                 = gl.getUniformLocation(prog, 'shininess');

    shProgram.iLightPos                  = gl.getUniformLocation(prog, 'lightPosition');
    shProgram.iSpecularCoefficient       = gl.getUniformLocation(prog, 'specularCoefficient');
    shProgram.iAmbientCoefficient        = gl.getUniformLocation(prog, 'ambientCoefficient');
    shProgram.iDiffuseCoefficient        = gl.getUniformLocation(prog, 'diffuseCoefficient');

    shProgram.iFScale                    = gl.getUniformLocation(prog, 'fScale');
    shProgram.iSampler                   = gl.getUniformLocation(prog, 'sampler');
    shProgram.iScalePoint                = gl.getUniformLocation(prog, 'scalePoint');

    loadTexture();

    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData(), createTextureCoordinates());

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    lightPositionEl = document.getElementById('lightPostion');
    scalePositionEl = document.getElementById('scalePostion');
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
    draw();
}

function loadTexture()
{
    var texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    var image = new Image();
    image.crossOrigin = 'anonymous'
    image.src = "https://lh3.googleusercontent.com/9wkYryGX1XUiTq81UhqcCY-PDDcbNtGcV7n4iajZr9fgzAGXUPOJ4Xxr4aKvlPFAWaEi"
    image.addEventListener('load', () => {
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
        draw();
    });
}

function Redraw() {
    surface.BufferData(CreateSurfaceData(),createTextureCoordinates());
    draw();
}