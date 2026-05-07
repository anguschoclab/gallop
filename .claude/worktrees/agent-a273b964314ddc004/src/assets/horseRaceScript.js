var g_SIMHorseRaceViewer_Version = "1.1";
var DEBUG = false;

var g_nCanvasWidth;
var g_nCanvasHeight;
var g_nTrackTop;

var g_nHorseHarnessWidth = 80;
var g_nHorseHeight = 50;

var g_nHorseWidth = 50;
var g_fPixelDist = 8.0 / 5280.0 / 30; // distance, fraction of a mile that a pixel represents, assuming a horse is 8 feet long and 50 pixels

var g_RaceSetupAnimationSpeed = 3000;

var g_nRaceID = 0;
var g_nRaceEntries = 0;

// Class singletons
var g_RaceTimer; // CRaceTimer
var g_RaceTrack; // CRaceTrack
var g_HorseArray = new Array(); // array of CRaceHorse

// Background Spritely graphics
var g_Sky;
var g_Fence;
var g_Turf;
var g_Marker; // in V1.0 we can only show one at a time
var g_Horse;

/* Test Cases
A race with one horse, grass: 294461    run
A race with 20 horses (Dirt): 245661    run
Shortest race (100 yards): 291724   run
Longest Race (4 miles), grass, steeple, 7 horses: 257958  run
Steeple (always turf), 14 horses: 257954    run
All Weather track, 8 horses: 258034     run
Harness Race (horses w/buggys): 258240
12 horses, all weather 155200   NO
6 horses, dirt: 258190  NO
11 horses, grass: 155215 BACKWARDS!
9 horses grass: 155211  2 frames
*/

(function () {})(); // Called when loaded. Dont touch.

/////// Public Functions ////////   May be called externally

function GetVersionNumber() {
  return g_SIMHorseRaceViewer_Version;
}

function initAtStartup(checksum) {
  bSuccess = loadRaceData(checksum);
  setupCanvas();

  setupTrack();

  return bSuccess; // startup successful
}

function SetPreraceAnimationSpeedInSeconds(duration) {
  if (duration < 0.0) duration = 0.0;
  if (duration > 3.0) duration = 3.0;
  g_RaceSetupAnimationSpeed = duration * 1000;
}

function Reset() {
  resetRace();
}

function IsRaceInProgress() {
  return g_RaceTimer.bIsRunning;
}

function StartRaceToggle() {
  if (g_RaceTimer.bIsRunning == false) startRace();
  else pauseRace();
}

function SetRaceRate(rate) {
  g_RaceTimer.SetRaceRate(rate);
}

function ShowPhotoFinish() {
  pauseRace();
  g_RaceTimer.SetRaceTime(g_RaceTimer.fRaceDuration);
  g_RaceTrack.setFocalPointForTime(g_RaceTimer.fRaceDuration, g_RaceTimer.fRaceDistance);

  SetStateForAllHorses(kHorseState_PhotoFinish);

  g_RaceTrack.currentCheckpoint = g_RaceTimer.fRaceDistance;
  g_RaceTrack.chooseCheckpointGraphic();
  g_RaceTrack.drawCheckpoint();
  updateRaceTickers();
}

/////// Private Functions ////////  Do Not call externally

function imagePath(imageName) {
  return "imagesViewer/" + imageName;
}

function loadRaceData(id) {
  g_sRaceName = raceData.Name;
  g_nRaceID = raceData.RaceID;
  g_nRaceEntries = raceData.NumEntries;

  // set here if harness race
  if (raceData.Type == "harness") g_nHorseWidth = g_nHorseHarnessWidth;

  g_RaceTimer = new CRaceTimer();
  var dist = parseFloat(raceData.Miles);
  var dur = parseFloat(raceData.FinishTime);
  g_RaceTimer.SetDistanceAndDuration(dist.valueOf(), dur.valueOf());

  return id == raceData.RaceID; // confirm data
}

function setupCanvas() {
  // Use the width and height defined in the .css file
  var the_stage = document.getElementById("stage");
  g_nCanvasWidth = the_stage.offsetWidth - 4;
  g_nCanvasHeight = the_stage.offsetHeight - 4;

  // I should also read this from the css
  g_nTrackTop = 80;

  jQuery('<div id="skyGraphic"></div>').appendTo("#stage");
  jQuery("#skyGraphic").css(
    "background",
    "transparent url(" + imagePath(raceData.SkyGraphic) + ") repeat-x",
  );
  g_Sky = jQuery("#skyGraphic").pan({ fps: 30, speed: 10, dir: "left", depth: 0 });
  g_Sky.spStop();
  g_Sky.css({ top: 0, left: 0, height: 80, width: g_nCanvasWidth });

  jQuery('<div id="fenceGraphic"></div>').appendTo("#stage");
  jQuery("#fenceGraphic").css(
    "background",
    "transparent url(" + imagePath(raceData.FenceGraphic) + ") repeat-x",
  );
  g_Fence = jQuery("#fenceGraphic").pan({ fps: 30, speed: 10, dir: "left", depth: 68 }); // 68 was found by trial and error to match the velocity of the moving markers.
  g_Fence.spStop();
  g_Fence.css({ top: 60, left: 0, height: 29, width: g_nCanvasWidth });

  jQuery('<div id="trackGraphic"></div>').appendTo("#stage");
  jQuery("#trackGraphic").css(
    "background",
    "transparent url(" + imagePath(raceData.SurfaceGraphic) + ") repeat-x",
  );
  g_Turf = jQuery("#trackGraphic").pan({ fps: 30, speed: 10, dir: "left", depth: 68 });
  g_Turf.spStop();

  var markerGraphic = "markers-start.png";
  jQuery('<div id="trackObstacle"></div>').appendTo("#stage");
  jQuery("#trackObstacle").css(
    "background",
    "transparent url(" + imagePath(markerGraphic) + ") repeat-x",
  );
  g_Marker = jQuery("#trackObstacle").pan({ fps: 30, speed: 0, dir: "up", depth: 100 });
  g_Marker.spStop();
  g_Marker.css("z-index", 90);

  // template for the horses, cloned when needed
  g_Horse = jQuery('<div class="horseGraphic"></div>');
}

// extended Number type
Number.prototype.ClockFormatting = function () {
  var num = this;
  var sec = num % 60.0;
  var min = (num - sec) / 60.0;
  var sPad = "";
  if (sec < 10) sPad = "0";
  return min + ":" + sPad + sec.toFixed(1);
};

function updateRaceTickers() {
  var curr = g_RaceTimer.CurrentTime();
  var dist = g_RaceTimer.ElapsedDistance().toFixed(2);

  if (curr > g_RaceTimer.fRaceDuration) curr = g_RaceTimer.fRaceDuration;

  if (dist > g_RaceTimer.fRaceDistance) dist = g_RaceTimer.fRaceDistance;

  var clock = curr.ClockFormatting();
  var sloMo = "";
  if (g_RaceTimer.fRate <= 0.5) sloMo = " [SloMo]";
  if (g_RaceTimer.fRate >= 4.0) sloMo = " [4X]";

  g_RaceTrack.timerText.html("Timer: " + clock + sloMo);
  g_RaceTrack.distText.html("Distance: " + dist + " miles");
}

function CRaceTimer() {
  var methods = {};

  methods.fTime = 0.0; // time elapsed since beginning of the race
  methods.fRate = 1.0; // normal realtime playback rate

  methods.fRaceDistance = 1.0; // in miles
  methods.fRaceDuration = 60.0; // in seconds

  methods.bIsRunning = false;

  //// these values are all calculated or fixed - DO NOT SET directly
  methods.fRaceAvgVelocity; // in miles/sec
  methods.fRaceAvgMPH; // in miles/hr

  methods.fUpdateInterval = 0.1; // timer is updated
  methods.fAnimationInterval = 0.1;
  methods.nAnimationIntervalMilliseconds = methods.fAnimationInterval * 1000;

  methods.fPixelDist = g_fPixelDist;
  methods.timerRef;

  methods.SetDistanceAndDuration = function (dist, dur) {
    methods.fRaceDistance = dist;
    methods.fRaceDuration = dur;
    methods.fRaceAvgVelocity = methods.fRaceDistance / methods.fRaceDuration;
    methods.fRaceAvgMPH = methods.fRaceAvgVelocity * 3600;
    return this;
  };

  methods.SetRaceTime = function (time) {
    methods.fTime = time;
  };

  methods.SetRaceRate = function (rate) {
    if (rate < 0.25) rate = 0.25;
    if (rate > 4.0) rate = 4.0;
    if (rate == methods.fRate) return; // nothing to set

    methods.fRate = rate;

    backgroundAnimation(methods.fRate * 10);
  };

  methods.CurrentTime = function () {
    return methods.fTime;
  };
  methods.NextAnimateTime = function () {
    nextTime = methods.fTime + methods.fAnimationInterval;
    return nextTime;
  };
  methods.ElapsedPercent = function () {
    return methods.fTime / methods.fRaceDuration;
  };
  methods.ElapsedDistance = function () {
    var dist = methods.fTime * methods.fRaceAvgVelocity;
    return dist;
  };
  methods.DistanceAtTime = function (time) {
    return time * methods.fRaceAvgVelocity;
  };
  methods.DistanceToPixels = function (distance) {
    return distance / methods.fPixelDist;
  };
  methods.PixelsToDistance = function (pixels) {
    return pixels * methods.fPixelDist;
  };
  methods.PixelsDuringInterval = function (time) {
    return methods.DistanceToPixels(time * methods.fRate * methods.fRaceAvgVelocity);
  };

  methods.Increment = function () {
    if (methods.bIsRunning == false)
      // this shouldnt ever happen
      return;

    methods.fTime += methods.fUpdateInterval * methods.fRate;
    if (methods.fTime < 0.0) // if the timer is running backwards, stop at 0
    {
      methods.fTime = 0.0;
      methods.StopTiming();
    }

    /*       if (methods.fTime > methods.fRaceDuration - 2.0) // auto slo-mo
        {
            methods.SetRaceRate(0.25);
        } */

    if (methods.fTime > methods.fRaceDuration - 2.0) // auto switch back to regular speed
    {
      methods.SetRaceRate(1.0);
    }
  };

  methods.StartTiming = function () {
    methods.bIsRunning = true;
    methods.timerRef = setInterval("TimerCallback()", 1000 * methods.fUpdateInterval);
  };
  methods.StopTiming = function () {
    clearInterval(methods.timerRef);
    methods.bIsRunning = false;
    methods.timerRef = 0;
  };

  return methods;
}

function TimerCallback() {
  g_RaceTimer.Increment();

  if (IsRaceComplete() == true) {
    g_RaceTimer.StopTiming();
  } else {
    animateHorses(g_RaceTimer.NextAnimateTime());
    g_RaceTrack.drawCheckpoint();

    if (g_RaceTimer.ElapsedPercent() >= 1.0)
      // means lead horse has crossed
      backgroundAnimation(0);
  }
  updateRaceTickers();
}

function CRaceTrack() {
  var methods = {};

  //// Member Variables & Initialization ////
  methods.nTrackTop = g_nTrackTop;
  methods.nTrackWidth = g_nCanvasWidth;
  methods.nTrackHeight = g_nCanvasHeight - methods.nTrackTop;

  methods.nLaneHeight = g_nHorseHeight; // the preferred height (could be shorter)
  methods.nLaneLeftInset = 20.0;
  methods.nLaneRightInset = 80;

  methods.nFocalPointInsetRight = 80;

  methods.nFocalPointLeftX = 220 + g_nHorseWidth;
  methods.nFocalPointRightX =
    methods.nTrackWidth - (methods.nLaneRightInset + methods.nFocalPointInsetRight);
  methods.nFocalWidth = methods.nFocalPointRightX - methods.nFocalPointLeftX;

  methods.nFocalPointX = methods.nFocalPointLeftX;
  methods.nFocalPointDistance = 0.0;

  methods.timerText;
  methods.distText;

  methods.Checkpoints = [];
  methods.currentCheckpoint;

  //// Functions ////
  methods.setFocalPointForTime = function (time, dist) {
    methods.nFocalPointDistance = dist;

    if (dist == 0)
      // default behavior based on race average speed, not used
      methods.nFocalPointDistance = g_RaceTimer.DistanceAtTime(time);

    methods.nFocalPointX =
      (time / g_RaceTimer.fRaceDuration) * methods.nFocalWidth + methods.nFocalPointLeftX;

    if (methods.nFocalPointX > methods.nFocalPointRightX) // limit on right
    {
      methods.nFocalPointX = methods.nFocalPointRightX;
      methods.nFocalPointDistance = g_RaceTimer.fRaceDistance;
    }
  };

  methods.distanceToX = function (dist) {
    var dist_diff = methods.nFocalPointDistance - dist;
    var pix_diff = g_RaceTimer.DistanceToPixels(dist_diff);
    return methods.nFocalPointX - pix_diff;
  };

  methods.setupLanes = function (numLanes) {
    var laneHeight = (methods.nTrackHeight - 40) / numLanes;
    if (laneHeight < methods.nLaneHeight) methods.nLaneHeight = laneHeight;

    // Emily decided to go with a fixed height for the track
    //       methods.nTrackHeight = (numLanes * methods.nLaneHeight) + 10;

    // positioning of these elements comes from the css
    methods.timerText = jQuery('<div id="timerReadout"></div>').appendTo("#stage");
    methods.distText = jQuery('<div id="distanceReadout"></div>').appendTo("#stage");

    methods.setupCheckpoints();
    methods.currentCheckpoint = 0.0;
  };

  methods.startupAnimations = function () {
    methods.currentCheckpoint = 0.0;
    methods.chooseCheckpointGraphic();

    g_Turf.css({
      top: methods.nTrackTop,
      left: 0,
      height: methods.nTrackHeight,
      width: 10,
      opacity: 0.0,
    }); // starting point before animation
    g_Marker.css({
      top: methods.nTrackTop,
      height: methods.nTrackHeight,
      left: 700,
      width: 40,
      opacity: 1.0,
    }); // starting point before animation

    g_Marker.show();

    g_Turf.animate(
      {
        top: methods.nTrackTop,
        left: 0,
        height: methods.nTrackHeight,
        width: methods.nTrackWidth,
        opacity: 0.9,
      },
      g_RaceSetupAnimationSpeed,
    );
    g_Marker.animate({ left: methods.nFocalPointLeftX }, g_RaceSetupAnimationSpeed);
  };

  methods.getLaneTop = function (laneNum) {
    return methods.nLaneHeight * laneNum + methods.nTrackTop;
  };

  methods.setupCheckpoints = function () {
    methods.Checkpoints.push(0.0); // add start line

    var steepleDistance = 0.125; // eighth of a mile
    for (steeps = steepleDistance; steeps < g_RaceTimer.fRaceDistance; steeps += steepleDistance) {
      methods.Checkpoints.push(steeps);
    }

    methods.Checkpoints.push(g_RaceTimer.fRaceDistance); // add finish line
  };

  methods.setCheckpointGraphic = function (markerURL) {
    g_Marker.hide();
    g_Marker.css("left", g_nCanvasWidth); // move it far to the right
    var tag = "transparent url(" + markerURL + ") repeat-y";
    g_Marker.css("background", tag);
  };

  methods.setCurrentCheckpoint = function (dist) {
    methods.currentCheckpoint = 0;
    for (
      var iter = methods.Checkpoints.length - 1;
      iter >= 0;
      iter-- // reverse iteration
    ) {
      if (dist <= methods.Checkpoints[iter]) methods.currentCheckpoint = methods.Checkpoints[iter];
      else break;
    }
  };

  methods.chooseCheckpointGraphic = function () {
    if (methods.currentCheckpoint == 0.0)
      methods.setCheckpointGraphic(imagePath("markers-start.png"));
    else if (methods.currentCheckpoint == g_RaceTimer.fRaceDistance)
      methods.setCheckpointGraphic(imagePath("markers-finish.png"));
    else if (raceData.Steeple == 1) methods.setCheckpointGraphic(imagePath("markers-steeple.png"));
    else methods.setCheckpointGraphic(imagePath("markers-furlong.png"));
  };

  methods.checkpointIsJump = function () {
    if (methods.currentCheckpoint == 0.0) return false;
    else if (methods.currentCheckpoint == g_RaceTimer.fRaceDistance) return false;
    else if (raceData.Steeple == 1) return true;
    else return false;
  };

  methods.checkpointX = function () {
    var dist = methods.currentCheckpoint;
    var xx = g_RaceTrack.distanceToX(dist);
    return xx;
  };

  methods.drawCheckpoint = function () {
    var xx = methods.checkpointX();
    if (xx < -50) {
      // checkpoint is going all the way off the screen left
      methods.setCurrentCheckpoint(methods.nFocalPointDistance); // get next one ready
    }

    if (g_Marker && xx < g_nCanvasWidth) {
      // will be on screen so start animating
      if (xx > g_Marker.css("left")) xx = g_Marker.css("left");
      g_Marker.show();
      g_Marker.animate({ left: xx }, g_RaceTimer.nAnimationIntervalMilliseconds, "linear");
    } else {
      // Cue up the next checkpoint
      methods.chooseCheckpointGraphic(); // which will also hide and position off to the right
    }
  };

  return methods;
}

// Horse states
var kHorseState_Hide = 0;
var kHorseState_Show = 1;
var kHorseState_Paused = 2;

var kHorseState_PreraceOffscreen = 3;
var kHorseState_StartLine = 4;
var kHorseState_Racing = 5;
var kHorseState_CrossFinish = 6;
var kHorseState_Done = 7;
var kHorseState_PhotoFinish = 8;

function CRaceHorse(entry, lane) {
  var methods = {};

  //// Loading from data entry
  methods.data = entry;
  methods.name = entry["Horse"];
  methods.finishPlace = entry["FinishMessage"];
  methods.graphicURL = imagePath(entry["Graphic"]);

  methods.timings = entry["RaceTiming"];
  methods.segmentDistance = g_RaceTimer.fRaceDistance / (methods.timings.length - 1);

  methods.laneNum = lane;
  methods.laneTop = g_RaceTrack.getLaneTop(methods.laneNum);

  //// Member variables initialization
  methods.state = kHorseState_Hide;

  methods.distanceSinceStart = 0.0; // distance in miles
  methods.currentMPH = 0.0; // mph

  methods.horseSprite;
  methods.title;
  methods.scoreText;

  methods.triggerJump = false;
  methods.fpsFudge = 0;

  //// Member functions

  methods.setHorseGraphic = function (URL) {
    methods.horseSprite = g_Horse.clone().appendTo("#stage");
    methods.horseSprite.attr("id", methods.name); // each spritely element must have unique id

    var tag = "transparent url(" + URL + ") no-repeat";
    methods.horseSprite.css("background", tag);

    methods.horseSprite.css("width", g_nHorseWidth);
    methods.horseSprite.css("height", g_nHorseHeight);
    methods.horseSprite.css("top", methods.laneTop);
    methods.horseSprite.css("left", -g_nHorseWidth);

    methods.horseSprite.css("position", "absolute");
    methods.horseSprite.css("z-index", 90); // 90 ??

    methods.horseSprite = methods.horseSprite.sprite({
      fps: 2,
      no_of_frames: 6,
      start_at_frame: 1,

      on_last_frame: function (obj) {
        methods.checkForJump();
      },
    });

    // Just for fun to make the little horseys jump when you mouse them
    /* methods.horseSprite.mousedown(function(e) {
                                      methods.triggerJump = true;
                                    }); */
  };

  methods.checkForJump = function () {
    // the trigger is just for fun
    if (methods.triggerJump == true) {
      methods.doJump();
      methods.triggerJump = false;
      return;
    }

    if (g_RaceTrack.checkpointIsJump() == false) return;

    methods.fpsFudge = 0;
    var fps = methods.horseSprite.spGet("fps", 10);
    if (DEBUG) methods.scoreText.show(); // DEBUG

    //var animationDuration = (1.0/fps)*6;

    var takeoffPoint = 0; // num pixels before steeple for ideal takeoff point
    var animationLength = 120; // an estimate of how many pixels of distance are covered in one animation cycle

    var horseX = g_RaceTrack.distanceToX(methods.distanceSinceStart) - 25; // current center point of horse
    var pixelsToTakeoff = g_RaceTrack.checkpointX() - takeoffPoint - horseX;

    if (pixelsToTakeoff > 600 || pixelsToTakeoff < -60) {
      methods.doRun();
      return;
    }

    var cycles = (pixelsToTakeoff / animationLength + 0.5).toFixed(0); // num of animation cycles until takeoff point
    var adjustedAnimationLength = pixelsToTakeoff / cycles;
    var percentAdjust = animationLength / adjustedAnimationLength - 1.0; // determine if animation should slow or increase to arrive at teh takeoff point

    if (
      pixelsToTakeoff > 60
    ) // we are not close enough to jump, so adjust the animation rate up or down
    {
      methods.fpsFudge = fps * percentAdjust;
      // if (DEBUG) methods.scoreText.html("fudge " + methods.fpsFudge.toFixed(2));
    } else {
      methods.doJump();
      methods.scoreText.html(pixelsToTakeoff.toFixed(2)); // DEBUG
    }
  };

  methods.doRun = function () {
    methods.horseSprite.spState(1); // running sprite
    methods.fpsFudge = 0;
  };
  methods.doJump = function () {
    methods.horseSprite.spState(2); // jumping sprite
    methods.fpsFudge = -5;
  };

  methods.setupHorseLane = function () {
    methods.setHorseGraphic(methods.graphicURL);

    methods.title = jQuery('<div class="horseName"></div>').appendTo("#stage");
    methods.title.css("top", methods.laneTop + 20);
    methods.title.css("left", -100);
    methods.title.html(methods.name);

    methods.scoreText = jQuery('<div class="horsePlace"></div>').appendTo("#stage");
    methods.scoreText.css("top", methods.laneTop + 20);
    methods.scoreText.css("left", g_nCanvasWidth - 50);

    methods.switchToState(kHorseState_PreraceOffscreen);
  };

  methods.distanceAtTime = function (curTime) {
    for (var ix = 0; ix < methods.timings.length - 1; ix++) {
      var segTime1 = parseFloat(methods.timings[ix]);
      var segTime2 = parseFloat(methods.timings[ix + 1]);
      if (segTime2 > curTime) {
        var segVel = methods.segmentDistance / (segTime2 - segTime1);

        var dist = (curTime - segTime1) * segVel; // distance into current segment
        dist += methods.segmentDistance * ix; // elapsed distance to current segment

        methods.distanceSinceStart = dist;
        methods.currentMPH = segVel * 3600; // mph
        return dist;
      }
    }

    // getting to this point means the race is over
    methods.distanceSinceStart = g_RaceTimer.fRaceDistance;
    methods.isFinished = true;
    methods.switchToState(kHorseState_CrossFinish);

    return methods.distanceSinceStart;
  };

  /*    methods.moveTo = function (pos) {
        methods.horseSprite.css({ left: pos-g_nHorseWidth });
    }  */

  methods.animateToWithInterval = function (pos, interval) {
    methods.horseSprite.stop(); // clears out any unfinished animations
    methods.horseSprite.animate({ left: pos.toFixed() - g_nHorseWidth }, interval, "linear");

    if (pos < 0) methods.horseSprite.hide();
    else methods.horseSprite.show();

    // horse lagging behind indicator
    sPrefix = "";
    if (pos < -300) sPrefix = "<<< ";
    else if (pos < -150) sPrefix = "<< ";
    else if (pos < 0) sPrefix = "< ";
    methods.title.html(sPrefix + methods.name);
  };

  methods.animateTo = function (pos) {
    methods.animateToWithInterval(pos, g_RaceTimer.nAnimationIntervalMilliseconds);
    methods.setHorseSpeed();
    //console.log('Just testing logging');
  };

  methods.animateHorseAtTime = function (time) {
    methods.distanceAtTime(time);
    methods.animateHorseAtCurrent();
  };

  methods.animateHorseAtCurrent = function () {
    var xx = g_RaceTrack.distanceToX(methods.distanceSinceStart);
    methods.animateTo(xx);
  };

  methods.setHorseSpeed = function () {
    var relativeSpeedIndex = methods.currentMPH - g_RaceTimer.fRaceAvgMPH;
    var horseFPS = (10 + relativeSpeedIndex * 1) * g_RaceTimer.fRate;

    horseFPS += methods.fpsFudge; // adjust the stride to align with upcoming steeple

    if (horseFPS < 2) horseFPS = 2;
    if (horseFPS > 20) horseFPS = 20;

    //methods.scoreText.html(horseFPS.toFixed(1));   // DEBUG
    methods.horseSprite.fps(horseFPS.toFixed(0));
  };

  methods.showScores = function () {
    methods.scoreText.html(methods.finishPlace);
    methods.scoreText.css({ "font-size": 5, opacity: 0.5 });
    methods.scoreText.show();
    methods.scoreText.animate({ "font-size": 20, opacity: 1.0 }, 1000);
  };

  methods.switchToState = function (newState) {
    switch (newState) {
      // These are just helpers, not true states
      case kHorseState_Hide:
        methods.horseSprite.hide();
        break;

      case kHorseState_Show:
        methods.horseSprite.show();
        break;

      // States - horse may only be in one at a time
      case kHorseState_PreraceOffscreen:
        methods.horseSprite.css("left", -100); // start offscreen
        methods.horseSprite.spStop();

        methods.title.css("opacity", 0);
        methods.scoreText.hide();

        methods.state = kHorseState_PreraceOffscreen;
        break;

      case kHorseState_StartLine:
        methods.isFinished = false;

        // pre race animations
        methods.animateToWithInterval(g_RaceTrack.nFocalPointLeftX, g_RaceSetupAnimationSpeed);
        methods.title.animate(
          { left: g_RaceTrack.nLaneLeftInset, opacity: 1.0 },
          g_RaceSetupAnimationSpeed,
        );
        methods.scoreText.hide();
        methods.state = kHorseState_StartLine;
        break;

      case kHorseState_Racing:
        methods.horseSprite.spStart();

        methods.title.animate({ left: g_RaceTrack.nLaneLeftInset, opacity: 0.5 }, 1.0);
        methods.scoreText.hide();
        methods.state = kHorseState_Racing;
        break;

      case kHorseState_Paused:
        methods.horseSprite.spStop();
        methods.state = kHorseState_Paused;
        break;

      case kHorseState_CrossFinish:
        methods.animateToWithInterval(g_nCanvasWidth - 60, 1000);
        methods.state = kHorseState_CrossFinish;

        break;

      case kHorseState_Done:
        methods.horseSprite.spStop();

        methods.title.animate({ left: 450, opacity: 1.0 }, 1000);
        methods.showScores();

        methods.state = kHorseState_Done;
        break;

      case kHorseState_PhotoFinish:
        methods.animateHorseAtTime(g_RaceTimer.fRaceDuration);
        methods.horseSprite.spStop(); // because the animate makes it run
        methods.state = kHorseState_PhotoFinish;
        methods.title.animate({ left: g_RaceTrack.nLaneLeftInset, opacity: 0.5 }, 1.0);
        methods.showScores();
        break;
    }
  };

  return methods;
}

// Functions that act on all horses
function SetStateForAllHorses(newState) {
  for (var iter in g_HorseArray) {
    var horse = g_HorseArray[iter];
    horse.switchToState(newState);
  }
}

function CheckStateForAllHorses(checkState) {
  for (var iter in g_HorseArray) {
    var horse = g_HorseArray[iter];
    if (horse.state != checkState) return false;
  }
  return true;
}

function CheckStateForAnyHorse(checkState) {
  for (var iter in g_HorseArray) {
    var horse = g_HorseArray[iter];
    if (horse.state == checkState) return true;
  }
  return false;
}

function setupTrack() {
  g_RaceTrack = new CRaceTrack();

  g_RaceTrack.setupLanes(g_nRaceEntries);

  for (x = 0; x < raceData.entries.length; x++) {
    var entry = raceData.entries[x];
    var horse = CRaceHorse(entry, x);
    horse.setupHorseLane();
    g_HorseArray.push(horse);
  }

  resetRace();
}

function resetRace() {
  g_RaceTimer.StopTiming();
  SetStateForAllHorses(kHorseState_Paused);

  g_RaceTimer.SetRaceTime(0.0);
  g_RaceTimer.SetRaceRate(1.0);

  SetStateForAllHorses(kHorseState_PreraceOffscreen);
  g_RaceTrack.startupAnimations();
  SetStateForAllHorses(kHorseState_StartLine);

  updateRaceTickers();
  backgroundAnimation(0);
}

function startRace() {
  SetStateForAllHorses(kHorseState_Racing);

  backgroundAnimation(g_RaceTimer.fRate * 10);
  animateHorses(g_RaceTimer.CurrentTime());
  g_RaceTrack.drawCheckpoint();

  g_RaceTimer.StartTiming();
}

function pauseRace() {
  if (g_Marker) g_Marker.stop(true);
  g_RaceTimer.StopTiming();
  SetStateForAllHorses(kHorseState_Paused);
  backgroundAnimation(0);
}

function IsRaceComplete() {
  return CheckStateForAllHorses(kHorseState_Done);
}

function calcHorseDistancesReturnLeadHorse(time) {
  var leadHorseDist = 0.0;
  var leadHorse;
  for (iter in g_HorseArray) {
    horse = g_HorseArray[iter];
    var horseDist = horse.distanceAtTime(time);

    if (horseDist > leadHorseDist) {
      leadHorse = horse; // this horse is in the lead
      leadHorseDist = horseDist;
    }
  }
  return leadHorse;
}

function animateHorses(nextRaceTime, animateInterval) {
  if (animateInterval == "undefined") animateInterval = g_RaceTimer.nAnimationIntervalMilliseconds;

  var leadHorseDist = 0.0;
  var leadHorse = calcHorseDistancesReturnLeadHorse(nextRaceTime);
  if (leadHorse) leadHorseDist = leadHorse.distanceSinceStart;

  g_RaceTrack.setFocalPointForTime(nextRaceTime, leadHorseDist);

  for (iter in g_HorseArray) {
    horse = g_HorseArray[iter];

    if (horse.state == kHorseState_Racing) {
      horse.animateHorseAtCurrent();
    }
  }
  if (CheckStateForAllHorses(kHorseState_CrossFinish)) SetStateForAllHorses(kHorseState_Done);
}

function backgroundAnimation(speed) {
  if (speed == 0) {
    g_Sky.spStop();
    g_Fence.spStop();
    g_Turf.spStop();
  } else {
    g_Sky.spRelSpeed(speed);
    g_Fence.spRelSpeed(speed);
    g_Turf.spRelSpeed(speed);

    g_Sky.spStart();
    g_Fence.spStart();
    g_Turf.spStart();
  }
}

function nil() {
  alert("Calling NIL function!");
  return false;
}
