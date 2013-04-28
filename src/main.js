
/*** Important Globals ***/

var gWindowWidth = 1000;
var gWindowHeight = 500;
var gColorPalette = ['#EFFFDE', '#ADD794', '#529273', '#183442'];

/*** User Input ***/

var gButtonWidth = 64;
var gButtonHeight = 64;
var gButtonCount = 4;
var gButtonTexts = ["Marine $10", "Mech $30", "Tank $80", "Gunship $200"];

/*** World Geometry ***/

// Programatically generated
var gWorldPolygon = []; //[[0, 350], [10, 400], [50, 410], [100, 405], [200, 380], [250, 395], [250, 350]];

/*** Player Properties ***/

gPlayerBank: 0;

/*** CraftyJS Support Code ***/

function Game_Load()
{
    // Generate our world geometry (simple sum-series of sin functions)
    var pointCount = 100;
    var pointSpread = 32;
    var offset = 22.0; // Change this to get a different "seeded" pattern
    for(var i = 0; i < pointCount; i++)
    {
        // Pro-tip: This sin func. is totally hand-made and doesn't actually mean anything; I kept fudging the numbers
        // until we had a cool looking scene!
        var x = i * pointSpread;
        var y = gWindowHeight * 0.9 - pointSpread * 2 +
           10.0 * Math.sin(offset + i) +
           10.0 * Math.sin(offset + i * 100) +
           5.0 * Math.cos( offset + parseFloat(i) / 100.0) +
           5.0 * Math.cos( offset + 100.0 * Math.random() );
        gWorldPolygon.push([x, y]);
    }
    
    // Define how we are drawn...
    Crafty.c("GameUnit", {
        
        init: function(){
            // Register for future updates
            this.bind("EnterFrame",function(e){
                this.moveTo( this._pos[0] + this._unit.stats.speed );
            });
        },
        
        initialize: function(unit, pos){
            // Type init            
            this._unit = {};
            this._pos = [0, 0];
            this._sprites = [];
            this._pos = pos;
            
            // Deep copy unit
            this._unit.price = unit.price;
            this._unit.stats = {speed:unit.stats.speed, minRange:unit.stats.minRange, accuracy:unit.stats.accuracy, fireRate:unit.stats.fireRate};
            this._unit.size = {width:unit.size.width, height:unit.size.height};
            this._unit.geo = unit.geo;

            // Unit component-sprite sizes
            var spriteWidth = 8;
            var spriteHeight = 8;

            // Generate all relavent sprites
            for(var y = 0; y < this._unit.size.height; y++)
            {
                this._sprites.push( new Array(this._unit.size.width) );
                for(var x = 0; x < this._unit.size.width; x++)
                {
                    // Retained for future movement
                    var colorIndex = this._unit.geo[y][x];
                    if( colorIndex == 0 )
                        continue;
                    this._sprites[y][x] = Crafty.e("2D, Canvas, Color").color( gColorPalette[colorIndex] ).attr({x: pos[0] + x * gSpriteWidth, y: pos[1] + y * gSpriteHeight, w: gSpriteWidth, h: gSpriteHeight});
                }
            }
        },
        
        moveTo: function(px) {
            // Save this as an update
            this._pos[0] = px;
            
            // Which edge are we on?
            var edgeIndex = -1;
            for(var i = 0; i < gWorldPolygon.length - 1; i++)
            {
                if( this._pos[0] > gWorldPolygon[i][0] )
                    edgeIndex = i;
            }
            
            // Ignore if out of bounds
            if( edgeIndex < 0 )
                return;
            
            // Compute intersection point
            var pt0 = gWorldPolygon[edgeIndex + 0];
            var pt1 = gWorldPolygon[edgeIndex + 1];
            var delta = (pt1[1] - pt0[1]) / (pt1[0] - pt0[0]);
            var b = pt0[1] - delta * pt0[0];
            
            // Update root position
            var pos = [this._pos[0], delta * this._pos[0] + b];
            pos[1] -= this._unit.size.height * gSpriteHeight;
            this._pos = pos;
            
            // Generate all relavent sprites
            for(var y = 0; y < this._unit.size.height; y++)
            for(var x = 0; x < this._unit.size.width; x++)
            {
                // Retained for future movement
                var colorIndex = this._unit.geo[y][x];
                if( colorIndex == 0 )
                    continue;
                var deltaX = x * gSpriteWidth;
                this._sprites[y][x].attr({x: pos[0] + x * gSpriteWidth, y: pos[1] + y * gSpriteHeight + deltaX * delta, w: gSpriteWidth, h: gSpriteHeight});
            }
        }
    });
    
    // Scenery geometry
    Crafty.c("Scenery", {
        
        initialize: function(scenery, pos){
        
            // Self init
            this._sprites = [];
            this._size = {width: scenery.size.width, height: scenery.size.height};
            this._spriteSize = {width: scenery.spriteSize.width, height: scenery.spriteSize.height};
            this._pos = pos;
            
            // Generate all relavent sprites
            for(var y = 0; y < this._size.height; y++)
            {
                this._sprites.push( new Array(this._size.width) );
                for(var x = 0; x < this._size.width; x++)
                {
                    // Retained for future movement
                    var colorIndex = scenery.geo[y][x];
                    if( colorIndex == 0 )
                        continue;
                    this._sprites[y][x] = Crafty.e("2D, Canvas, Color").color( gColorPalette[colorIndex] ).attr({x: pos[0] + x * this._spriteSize.width, y: pos[1] + y * this._spriteSize.height, w: this._spriteSize.width, h: this._spriteSize.height});
                }
            }
        }
    });
    
    Crafty.c("Particle", {
        _decay: 1,
        init: function() {
            this.addComponent("2D, Canvas, Color");
        },
        createParticle: function(pos, size, decay) {
            this._decay = decay || this._decay;
            this.attr({x:pos[0],
                       y:pos[1],
                       w:size[0],
                       h:size[1]});
            this.color(gColorPalette[3]);

            this.bind("EnterFrame",function(e){ this.update(); });
        },
        update: function() {
            var currentSize = this.w;
            if(currentSize > 0) {
                this.attr({w: currentSize - this._decay, h: currentSize - this._decay});
            } else {
                this.destroy();
            }
        }
    });

    var gAccel = [0, 10];
    Crafty.c("SampleProjectile", {
        _pos: null,
        _vel: null,
        _physics: null,
        init: function() {
            this.addComponent("2D, Canvas, Color, Collision");
        },
        createProjectile: function(pos, vel, physics) {
            this._pos = pos;
            this._vel = vel;
            this._physics = physics;

            this.attr({x: this._pos[0],
                       y: this._pos[1],
                       w: 8,
                       h: 8});
            this.color(gColorPalette[3]);

            this.collision();
            this.onHit('Ground', function() {
                console.log('collision!');
                this.destroy();
            });

            return this;
        },
        update: function(dt) {
            this._pos = add2d(this._pos, scale2d(this._vel, dt));
            if(this._physics) {
                this._vel = add2d(this._vel, scale2d(gAccel, dt));
            }
            Crafty.e('Particle').createParticle(this._pos, [5, 5], 0.1);
            this.attr({x:this._pos[0], y:this._pos[1]});
        },
    });

    // Define how the world is drawn..
    Crafty.c("GameBackground", {

        gKeyState: {},
        points: [],

        initialize: function( givenPoints ){
            // Args
            this.points = givenPoints;

            // Key down events
            this.requires('Keyboard').bind('KeyDown', function () {
                if(this.isDown('LEFT_ARROW'))
                    this.gKeyState['LEFT_ARROW'] = true;
                if(this.isDown('RIGHT_ARROW'))
                    this.gKeyState['RIGHT_ARROW'] = true;
            });
            this.requires('Keyboard').bind('KeyUp', function () {
                if(!this.isDown('LEFT_ARROW'))
                    this.gKeyState['LEFT_ARROW'] = false;
                if(!this.isDown('RIGHT_ARROW'))
                    this.gKeyState['RIGHT_ARROW'] = false;
            });

            // Create all initial entities..
            var len = this.points.length;
            for(var i = 1; i < len - 1; i++)
            {
                var prev = this.points[i - 1];
                var pt = this.points[i];
                var next = this.points[i + 1];

                // Left-length and right-length
                var leftLength = Math.abs(prev[0] - pt[0]) / 2.0;
                var rightLength = Math.abs(next[0] - pt[0]) / 2.0;

                var leftHeight = (prev[1] - pt[1]) / 4.0;
                var rightHeight = (next[1] - pt[1]) / 4.0;

                // Draw with depth..
                var stepHeight = 16;
                for(var y = 0; y < 3; y++)
                {
                    // No need to retain (draw left and right)
                    var spriteHeight = (y == 2) ? 300.0: stepHeight;
                    Crafty.e("2D, Canvas, Color, Ground").color( gColorPalette[y + 1] ).attr({x: pt[0] - leftLength, y: pt[1] + y * stepHeight + leftHeight, w: leftLength, h: spriteHeight});
                    Crafty.e("2D, Canvas, Color, Ground").color( gColorPalette[y + 1] ).attr({x: pt[0], y: pt[1] + y * stepHeight + rightHeight, w: rightLength, h: spriteHeight});
                    
                    // Debugging:
                    //Crafty.e("2D, Canvas, Color").color("red").attr({x: pt[0], y: pt[1], w: 4, h: 4});
                }
            }
            
            // Register for callback
            this.bind("EnterFrame",function(){
                this.update();
            })
        },

        update: function(){

            // Camera movement based on key events
            var moveSpeed = 8;
            if( this.gKeyState['LEFT_ARROW'] != undefined && this.gKeyState['LEFT_ARROW'] == true )
                Crafty.viewport.scroll('_x', Crafty.viewport.x + moveSpeed);
            if( this.gKeyState['RIGHT_ARROW'] != undefined && this.gKeyState['RIGHT_ARROW'] == true )
                Crafty.viewport.scroll('_x', Crafty.viewport.x - moveSpeed);
        }
    });

    // Define the main game scene
    Crafty.scene('GameScene',
        // Init
        function() {
            // Listen to update events
            GameScene_Init();
            Crafty.bind('EnterFrame', GameScene_Update);
        // Un-init
        }, function() {
            // No longer listen to this..
            Crafty.unbind('EnterFrame', GameScene_Update);
            GameScene_Uninit();
        }
    );

}

/*** Main game scene ***/

var GameScene_GameBackground = null;

var gProjectile = null;

function GameScene_Init()
{
    // Allocate background and both HQs
    Crafty.e('Scenery').initialize(sceneryHQ0, [50, 225]);
    Crafty.e('Scenery').initialize(sceneryHQ1, [1000, 250]);
    GameScene_GameBackground = Crafty.e('GameBackground').initialize(gWorldPolygon);
    
    // Create a single game unit for fun...
    Crafty.e('GameUnit').initialize(gFriendlyUnit1, [20, 50]);
    Crafty.e('GameUnit').initialize(gFriendlyUnit0, [50, 80]);
    Crafty.e('GameUnit').initialize(gFriendlyUnit0, [40, 80]);
    Crafty.e('GameUnit').initialize(gFriendlyUnit0, [30, 80]);
    
    gProjectile = Crafty.e('SampleProjectile').createProjectile([100, 100], [100, 0], true);
    
    // Last visual layer
    GameScene_InitUI();
}

function GameScene_InitUI()
{
    // For each button
    for(var i = 0; i < gButtonCount; i++)
    {
        var px = (gWindowWidth / gButtonCount) * i + (gWindowWidth / gButtonCount) / 2 - gButtonWidth / 2;
        var py = gWindowHeight - gButtonHeight - 8;
        
        // Button
        Crafty.e("2D, Canvas, Color, Mouse")
        .color(gColorPalette[1])
        .attr({ x: px, y: py, w: gButtonWidth, h: gButtonHeight, px: px })
        .bind('MouseOver', function() { this.color(gColorPalette[2]) })
        .bind('MouseOut', function() { this.color(gColorPalette[1]) })
        .areaMap([0,0], [gButtonWidth,0], [gButtonWidth,gButtonHeight], [0,gButtonHeight])
        .bind('EnterFrame', function() {
            this.x = -Crafty.viewport.x + this.px;
        });
        
        // Text
        Crafty.e("2D, DOM, Text")
        .attr({ x: px, y: py + gButtonHeight * 0.25, w: gButtonWidth, h: gButtonHeight * 0.5, px: px })
        .text(gButtonTexts[i])
        .textFont({ type: 'italic', family: 'Arial' })
        .textColor(gColorPalette[3])
        .bind('EnterFrame', function() {
            this.x = -Crafty.viewport.x + this.px;
        });
    }
}

var gLastFrame = null;
function GameScene_Update()
{
    var dt;
    if(!gLastFrame) {
        dt = 0;
        gLastFrame = Date.now();
    }
    else {
        var now = Date.now();
        dt = now - gLastFrame;
        gLastFrame = now;
    }
    dt /= 1000;

    if(gProjectile) {
        gProjectile.update(dt);
    }
}

function GameScene_Uninit()
{
    GameScene_GameBackground.destroy();
}

/*** Main Application Loop ***/

// Initialize and start our game
function GameStart()
{
    // Start crafty and set a background color so that we can see it's working
    Crafty.init(gWindowWidth, gWindowHeight).canvas.init();
    Crafty.background( gColorPalette[0] );

    // Game load (build data structures)
    Game_Load();

    // Set first scene the main game scene...
    Crafty.scene('GameScene');
}
