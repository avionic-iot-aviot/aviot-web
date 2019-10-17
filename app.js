
var socket = io('http://192.168.100.209:9000')


function onConnect(){
  socket.emit('connect_to_copter', 'mavros')
  socket.on('/mavros/battery', updateBatteryInfo)
  socket.on('/mavros/state', onStateUpdate)

}
function onStateUpdate(data) {
  let className = data.armed ? 'success' : 'danger'
  var info = "Status: " + (data.armed ? 'ARMED' : 'DISARMED')
  info = '<div class="alert alert-' + className +'" role="alert">'+ info +'</div>'
  $('#status').html(info + "\n")
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
  socket.emit('takeoff', {copterId: 'mavros', latitude: 37.527337, longitude: 15.112690, altitude: Number($('#altitude').val())})
}


$('#armThrottle').click(armThrottle)
$('#takeoff').click(takeoff)

socket.on('connect', onConnect)
socket.on('error', function(err){
  console.log(err)
})
