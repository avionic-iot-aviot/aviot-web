var opaqueId = "aviotstreaming-"+Janus.randomString(12);

var janus = null
var streaming = null
var streamId = null
var videoEl = null
console.log("Starting Janus Service")
Janus.init({debug: 'all', callback: onInitJanus})

function onInitJanus(){
  Janus.log("Janus init ok!")
  $('#streaming').attr('disabled', false)
}

function startJanusStream (msg, videoElement){
  videoEl = videoElement
  streamId = msg.janus_feed_id
  janus = new Janus({
    server: JANUS_SERVER_ENDPOINT,
    success: onCreateJanusSuccess,
    error: onCreateJanusError,
    destroyed: onJanusDestroyed
  })
}


function onCreateJanusSuccess() {
  janus.attach({
    plugin: 'janus.plugin.streaming',
    opaqueId: opaqueId,
    success: onAttachSuccess,
    error: onAttachError,
    iceState: function(state) {
      Janus.log("ICE state changed to " + state);
    },
    webrtcState: function(on) {
      Janus.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
    },
    onmessage: onAttachMessage,
    onremotestream: onRemoteStream
  })
}
function onCreateJanusError(error){
  Janus.log(error)
  alert(error.toString())
}

function onJanusDestroyed(){
  alert("Janus destroyed")
}

function onAttachError(err) {
  Janus.log(err)
}
function onAttachSuccess(pluginHandle){
  streaming = pluginHandle
  var body = { request: "watch", id: parseInt(streamId)};
  streaming.send({ message: body })
  Janus.log('Streaming plugin attached')
}
function onAttachMessage(msg, jsep){
  Janus.debug(" ::: Got a message :::", msg);
  var result = msg["result"];
  if(result) {
    if(result["status"]) {
      var status = result["status"];
      if(status === 'starting'){
        console.log("Starting")
      } else if(status === 'started') {
        console.log("Started")
      } else if(status === 'stopped'){
        //stopStream();
        console.log("Stoppped")
      }

    } else if(msg["streaming"] === "event") {
      // Is simulcast in place?

      console.log("EVENT message", msg)
    }
  } else if(msg["error"]) {
    alert(msg["error"]);
    //stopStream();
    return;
  }
  if(jsep) {
    Janus.debug("Handling SDP as well...", jsep);
    var stereo = (jsep.sdp.indexOf("stereo=1") !== -1);
    // Offer from the plugin, let's answer
    streaming.createAnswer(
      {
        jsep: jsep,
        // We want recvonly audio/video and, if negotiated, datachannels
        media: { audioSend: false, videoSend: false, data: true },
        customizeSdp: function(jsep) {
          if(stereo && jsep.sdp.indexOf("stereo=1") === -1) {
            // Make sure that our offer contains stereo too
            jsep.sdp = jsep.sdp.replace("useinbandfec=1", "useinbandfec=1;stereo=1");
          }
        },
        success: function(jsep) {
          Janus.debug("Got SDP!", jsep);
          streaming.send({ message: { request: "start" }, jsep: jsep });
        },
        error: function(error) {
          Janus.error("WebRTC error:", error);
          alert("WebRTC error... " + error.message);
        }
      });
  }
}

function onRemoteStream(stream){
  Janus.attachMediaStream(videoEl.get(0), stream)
}

function stopJanusStream(){
  streaming.send({ message: { request: "stop" } });
  streaming.hangup();
}
