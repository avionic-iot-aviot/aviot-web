let map;
let polygon = []
let areas = []
let area
var allow = true
var droneMarker = null


var colors = {
  allow: {
    stroke: 'rgb(92,184,92)',
    background: 'rgb(92,184,92, 0.8)'
  },
  deny: {
    stroke: 'rgb(217,83,79)',
    background: 'rgb(217,83,79, 0.8)'
  }
}
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 37.5111591, lng: 15.0833803 },
    zoom: 13,
  });



  map.addListener('click', addMarker)
  $("#map").css('height', '50vh')
}
function isAllowed(){
  return $('#allow-area:checked').length
}

function addMarker(evt) {

  let marker = new google.maps.Marker({
    position: {
      lat: evt.latLng.lat(),
      lng: evt.latLng.lng()
    },
    draggable: true,
    map,
    title: "Point " + (polygon.length+1),
  })
  
  marker.addListener('drag', refreshArea)

  polygon.push(marker)
  
  refreshArea()

  
}
function updateDronePos(lat, lng, droneId, center){
  if(droneMarker === null){
    droneMarker = new google.maps.Marker({
      position: {
        lat: lat,
        lng: lng
      },
      draggable: false,
      map,
      title: droneId,
    })
  }
  droneMarker.setPosition(new google.maps.LatLng(lat, lng))
  center && setCenter(lat, lng)
}
function setCenter(lat, lng){
  map.setCenter(new google.maps.LatLng(lat, lng))
}
function refreshArea(){
  if(area){
    area.setMap(null)
  }
  area = new google.maps.Polygon({
    fillColor: isAllowed() ? colors.allow.background : colors.deny.background,
    strokeColor: isAllowed() ? colors.allow.stroke : colors.deny.stroke,
    paths: polygon.map(m => new google.maps.LatLng(m.position.lat(), m.position.lng()))
  });
  area.setMap(map)
}
function addPolygon(){
  areas.push(polygon)
}
function removeMarkers(){
  polygon.forEach((m) => m.setMap(null))
  polygon = []
}

function removePolyline(index){

  let removed = areas.splice(index, 1);
  console.log(removed)
  removed[0].area.setMap(null)
  updateTable();
}
function updateTable(){

  let table = ''
  areas.forEach(function(a, index){

    let td = [
      '<td>'+ (index + 1) +'</td>',
      '<td>'+ a.polygon.length +'</td>',
      '<td><span class="text-'+ (a.isAllowed ? 'success' : 'danger') + ' ">' + (a.isAllowed ? 'Allow' : 'Deny') + '</span></td>',
      '<td><Button class="btn btn-sm btn-warning" onclick="removePolyline('+ index +')">remove</Button></td>'
    ]
    table += '<tr>' + td.reduce((acc, value) => acc + value, '') + '</tr>'
  })

  $('#polygons-table').html(table)
}

function addArea(){
  refreshArea()
  polygon.forEach(m => m.setMap(null))
  areas.push({
    area: area,
    polygon: polygon,
    isAllowed: isAllowed()
  })
  area = undefined
  polygon = []
  updateTable()
}
