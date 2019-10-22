
var socket = io('http://192.168.100.209:9000')
var listenerStatus = false
var latitude, longitude, altitude
function onConnect(){
  socket.emit('connect_to_copter', 'mavros')
  socket.on('/mavros/battery', updateBatteryInfo)
  socket.on('/mavros/state', onStateUpdate)
  socket.on('/mavros/global_position/global', onGlobalPosUpdate)
  socket.on('/mavros/global_position/rel_alt',onRelAltUpdate)

}
function onGlobalPosUpdate(msg){
  latitude = msg.latitude
  longitude = msg.longitude
  $('#lat').html(latitude)
  $('#lng').html(longitude)
}

function onRelAltUpdate(msg){
  console.log($('#land').attr('disabled'))
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
  socket.emit('arm', {copterId: 'mavros'})
}
function takeoff() {
  console.log('taking off');
  socket.emit('takeoff', {copterId: 'mavros', latitude, longitude, altitude: Number($('#altitude').val()) })
}

function land(){
  socket.emit('land', {copterId: 'mavros', latitude, longitude, altitude: 0} )
}
$('#armThrottle').click(armThrottle)
$('#takeoff').click(takeoff)
$('#land').click(land)

socket.on('connect', onConnect)
socket.on('error', function(err){
  console.log(err)
})






document.addEventListener('keydown',press)
var direction = {
  x: 0,
  y: 0,
  z: 0
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
      y: 1,
      z: 0
    }
  }
  if (e.keyCode === 39 /* right */ || e.keyCode === 68 /* d */){
    direction = {
      x: 1,
      y: 0,
      z: 0
    }
  }
  if (e.keyCode === 40 /* down */ || e.keyCode === 83 /* s */){
    direction = {
      x: 0,
      y: -1,
      z: 0
    }
  }
  if (e.keyCode === 37 /* left */ || e.keyCode === 65 /* a */ || e.keyCode === 81 /* q */){
    direction = {
      x: -1,
      y: 0,
      z: 0
    }
  }
  if (e.keyCode === 32 /* space */ || e.keyCode === 16 /* shift */){
    direction = {
      x: 0,
      y: 0,
      z: 1
    }
  }
  if (e.keyCode === 17 /* ctrl */){
    direction = {
      x: 0,
      y: 0,
      z: -1
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
    z: 0
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
    console.log('Publishing vel');
    socket.emit('cmd_vel', {copterId: 'mavros', ...direction})
    lastMsg = direction

  }
}, 100)
