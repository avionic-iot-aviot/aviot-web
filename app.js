
var socket = io('http://192.168.100.224:9000')


function onConnect(){
  socket.emit('connect_to_copter', 'mavros')
  socket.on('/mavros/battery', function(data){
    console.log(data);
    var info = "Battery: " + Math.round(data.percentage * 100)+ "%, "+ Math.round(data.voltage * 100) / 100 + "V / " + Math.round(data.current * 10 * -1) / 10 + "A"
    $('#battery').html(info + "\n")
  })

}




socket.on('connect', onConnect)
socket.on('error', function(err){
  console.log(err)
})
