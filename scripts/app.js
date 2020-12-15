var listenerStatus = false
var latitude, longitude, altitude


/**
 * Events:
 * - connect
 * - battery
 * - state
 * - global_position
 * - rel_alt
 */



let mavros = new AviotCopter('mavros', '', 'http://192.168.1.14:9000')

mavros.on('connect', function(){
  console.log('connected')
  $('#video').append('<video class="rounded centered" id="remotevideo" width="100%" height="100%" autoplay playsinline/>')
})
mavros.on('state', onStateUpdate)
mavros.on('battery', updateBatteryInfo)
mavros.on('global_position', onGlobalPosUpdate)
mavros.on('relative_altitude', onRelAltUpdate)
mavros.on('error', onError)
mavros.on('streaming', onStreaming)
mavros.on('video_room', onVideoRoom)

function onError(err){
  //handle errors
  console.error(err)
}

function onStreaming(msg){
  startJanusStream(msg, $('#remotevideo'));
console.log(msg)
}
function onVideoRoom(msg){
  console.log(msg)
  startJanusVideoRoom(msg, $('#remotevideo'))
}
function onGlobalPosUpdate(msg){
  latitude = msg.latitude
  longitude = msg.longitude
  $('#lat').html(latitude)
  $('#lng').html(longitude)
}

function onRelAltUpdate(msg){
  if(Math.round(msg) > 1){
    $('#land').attr('disabled', false)
    $('#takeoff').attr('disabled', true)
  }
  else if(Math.round(msg) === 0){
    $('#land').attr('disabled', true)
    if(latitude && longitude){
      $('#takeoff').attr('disabled', false)
    }
  }
  $('#alt').html(Math.round(msg * 10) / 10)
}
function onStateUpdate(data) {
  let className = data.armed ? 'success' : 'danger'
  var info = "Status: " + (data.armed ? 'ARMED' : 'DISARMED')
  info = '<div class="alert alert-' + className +'" role="alert">'+ info +'</div>'
  $('#status').html(info + "\n")
  if (data.armed && !listenerStatus){
    console.log('Enabling listener');
    document.addEventListener('keydown',press)
    listenerStatus = true
  } else if (!data.armed && listenerStatus){
    console.log('Disabling listener');
    document.removeEventListener('keydown', press)
    listenerStatus = false
  }
}
function updateBatteryInfo (data) {
  let className = ''
  let percentage = Math.round(data.percentage * 100)
  if(percentage > 60) {
    className = 'success'
  } else if (percentage <=60 && percentage > 20) {
    className = 'warning'
  } else className = 'danger'

  var info = "Battery: " + Math.round(data.percentage * 100)+ "%, "+ Math.round(data.voltage * 100) / 100 + "V / " + Math.round(data.current * 10 * -1) / 10 + "A"
  info = '<div class="alert alert-' + className +'" role="alert">'+ info +'</div>'
  $('#battery').html(info + "\n")
}


function armThrottle () {
  console.log('arming mavros');
  mavros.armThrottle()
}
function takeoff() {
  console.log('taking off');
  mavros.takeoff(latitude, longitude, Number($('#altitude').val()))
}

function land(){
  mavros.land(latitude, longitude, 0)
}


function startStreaming(){
  mavros.startStreaming()
  $('#streaming').html('STOP STREAMING')
  $('#streaming').attr('onclick', 'stopStreaming()')
  $('#streaming').attr('class', 'btn btn-warning')

}
function stopStreaming(){
  stopJanusStream();
  mavros.stopStreaming()
  $('#streaming').html('START STREAMING')
  $('#streaming').attr('onclick', 'startStreaming()')
  $('#streaming').attr('class', 'btn btn-success')

}

function startVideoRoom(){
  mavros.startVideoRoom()
  $('#videoroom').html('STOP VIDEO ROOM')
  $('#videoroom').attr('onclick', 'stopVideoRoom()')
  $('#videoroom').attr('class', 'btn btn-warning')
}
function stopVideoRoom(){
  mavros.stopVideoRoom()
  stopJanusVideoRoom()
  $('#videoroom').html('START VIDEO ROOM')
  $('#videoroom').attr('onclick', 'startVideoRoom()')
  $('#videoroom').attr('class', 'btn btn-success')
}


$('#armThrottle').click(armThrottle)
$('#takeoff').click(takeoff)
$('#land').click(land)


document.addEventListener('keydown',press)
var direction = {
  x: 0,
  y: 0,
  z: 0,
  _x: 0,
  _y: 0,
  _z: 0
}


/**
go_forward_cmd (0.0,5.0,0.0);
go_behind_cmd (0.0,-5.0,0.0);
go_left_cmd (-5.0,0.0,0.0);
go_right_cmd (5.0,0.0,0.0);
go_up_cmd (0.0,0.0,-5.0);
go_down_cmd (0.0,0.0,5.0);
*/
let publish = false
function press(e){
  if (e.keyCode === 38 /* up */ || e.keyCode === 87 /* w */ || e.keyCode === 90 /* z */){
    direction = {
      x: 0,
      y: 0.5,
      z: 0,
      _x: 0,
      _y: 0,
      _z: 0
    }
  }
  if (e.keyCode === 39 /* right */ || e.keyCode === 68 /* d */){
    direction = {
      x: 0.5,
      y: 0,
      z: 0,
      _x: 0,
      _y: 0,
      _z: 0
    }
  }
  if (e.keyCode === 40 /* down */ || e.keyCode === 83 /* s */){
    direction = {
      x: 0,
      y: -0.5,
      z: 0,
      _x: 0,
      _y: 0,
      _z: 0
    }
  }
  if (e.keyCode === 37 /* left */ || e.keyCode === 65 /* a */ || e.keyCode === 81 /* q */){
    direction = {
      x: -0.5,
      y: 0,
      z: 0,
      _x: 0,
      _y: 0,
      _z: 0
    }
  }
  if (e.keyCode === 32 /* space */ || e.keyCode === 16 /* shift */){
    direction = {
      x: 0,
      y: 0,
      z: 0.5,
      _x: 0,
      _y: 0,
      _z: 0
    }
  }
  if (e.keyCode === 17 /* ctrl */){
    direction = {
      x: 0,
      y: 0,
      z: -0.5,
      _x: 0,
      _y: 0,
      _z: 0
    }
  }
  publish = true
}

$(window).blur(function(){
  publish = false
})
$(window).focus(function(){
  publish = true
})

document.addEventListener('keyup',release)
function release(e){
  direction = {
    x: 0,
    y: 0,
    z: 0,
    _x: 0,
    _y: 0,
    _z: 0
  }
  publish = false
  console.log(publish);
}

var lastMsg = direction
setInterval(function(){
  if(listenerStatus && publish){

    if(lastMsg && lastMsg.x === 0 && lastMsg.y === 0 && lastMsg.z === 0 &&
      direction.x === 0 && direction.y === 0 && direction.z === 0 ){
      lastMsg = direction
      return
    }
    //console.log('Publishing vel');
    const { x, y, z, _x, _y, _z} = direction
    mavros.cmdVel({x, y, z}, {x: _x, y: _y, z: _z})
    lastMsg = direction

  }
}, 100)

const refreshRate = 100;
const output = document.getElementById('output');
setInterval(getGamepadState, refreshRate);


function getGamepadState() {
    // Returns up to 4 gamepads.
    const gamepads = navigator.getGamepads();
    // We take the first one, for simplicity
    const gamepad = gamepads[0];
    // Escape if no gamepad was found
    if (!gamepad) {
        //console.log('No gamepad found.');
        return;
    }
    // Filter out only the buttons which are pressed
    const pressedButtons = gamepad.buttons
        .map((button, id) => ({id, button}))
        .filter((btn) => !!btn.button.pressed);
    // Print the pressed buttons to our HTML
    if(!pressedButtons.length){
      direction = {
        x: 0,
        y: 0,
        z: 0
      }
    }
    for (const button of pressedButtons) {
        if (button.id === 2 /* ctrl */){
          direction = {
            x: 0,
            y: 0,
            z: 0
          }
          land()
          return
        }
        if(button.id === 7){ //r2
          direction.x = -1
        }
        if (button.id === 12 /* up arrow */){
          direction.y = 1
        }
        if (button.id === 15 /* right */){
          direction.x = 1
        }
        if (button.id === 13 /* down */){
          direction.y = -1
        }
        if (button.id === 14 /* left */){
          direction.x = -1
        }
        if (button.id === 7 /* r2 */ || button.id === 0 /* x */){
          direction.z = 1
        }
        if (button.id === 6 /* ctrl */){
          direction.z = -1
        }
    }
}
