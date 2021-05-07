var vrOpaqueId = "aviotvideoroom-"+Janus.randomString(12);

Janus.init({
  //debug: 'all',
  callback: onInitVrJanus
})
var videoRoomEl, roomName, roomPin, janusVr, sfutest, myid, mypvtid
var feeds = [], mystream = null
var bitrateTimer = [];

function onInitVrJanus(){
  Janus.log("Janus videoroom init ok!")
  $('#videoroom').attr('disabled', false)
  janusVr = new Janus({
    server: JANUS_SERVER_ENDPOINT,
    success: onCreateJanusVrSuccess,
    error: onCreateJanusVrError,
    destroyed: onJanusVrDestroyed
  })
}

function stopJanusVideoRoom(){
  if(janusVr !== null){
    unpublishOwnFeed()
    //janusVr.destroy()
    //janusVr = null
  }
}

function startJanusVideoRoom (msg, videoElement){
  videoRoomEl = videoElement
  roomName = msg.videoroom_name
  roomPin = msg.videoroom_pin
  var register = {
    request: "join",
    room: roomName,
    pin: ""+roomPin,
    secret: msg.videoroom_secret,
    ptype: "publisher",
    display: 'username'
  };
  myusername = 'username';
  console.log("Joining")
  sfutest.send({ message: register });

}

function onCreateJanusVrError(error){
  Janus.log(error)
}

function onJanusVrDestroyed(){
  console.log("Janus vr destroyed")
}
function onCreateJanusVrSuccess() {
  janusVr.attach({
    plugin: 'janus.plugin.videoroom',
    opaqueId: opaqueId,
    success: onVrAttachSuccess,
    error: onVrAttachError,
    iceState: function(state) {
      Janus.log("ICE state changed to " + state);
    },
    webrtcState: function(on) {
      Janus.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
      //$("#videolocal").parent().parent().unblock();
      if(!on)
        return;
    },
    mediaState: function(medium, on) {
      Janus.log("Janus " + (on ? "started" : "stopped") + " receiving our " + medium);
    },
    onmessage: onAttachVrMessage,
    onlocalstream: onVrLocalStream
  })
}

function onVrAttachSuccess(pluginHandle){
  sfutest = pluginHandle
  Janus.log("Plugin attached! (" + sfutest.getPlugin() + ", id=" + sfutest.getId() + ")");
}
function onVrAttachError(error){
  Janus.error("  -- Error attaching plugin...", error);
}

function handleVideRoomEvent(msg){
  
  msg.publishers && onNewJoiner(msg.publishers)

  msg.leaving && onLeave(msg.leaving)

  msg.unpublished && onUnpublish(msg.unpublished)

  msg.error && onVideRoomError(msg)
}

function onVideoRoomDestroyed(msg){
  console.log("Video room destroyed", msg)
}

function onNewJoiner(list){
  list.forEach(({id, display, audio_codec, video_codec}) => {
    newRemoteFeed(id, display, audio_codec, video_codec)
  })
}

function onLeave(publisherId){
  
  console.log("Publisher left: " + publisherId);
  var remoteFeed = null;

  remoteFeed = feeds.find(f => f.rfid === publisherId)
  
  if(remoteFeed){
    //TODO: Hide feed container
    console.log("Feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") has left the room, detaching");
    remoteFeed.detach()
  }
  
}

function onUnpublish(unpublished){
  if(unpublished === 'ok') {
    sfutest.hangup();
    return;
  }
  onLeave(unpublished)
}

function onJoin(msg){
  myid = msg.id
  mypvtid = msg.private_id
  msg.publishers && onNewJoiner(msg.publishers)
  publishOwnFeed()
}

function onVideRoomError(error){
  if(error.error_code === 429){
    alert("Room not found")
  }
  console.error(error.error)
}

function handleJsep(jsep, audio_codec, video_codec){
  sfutest.handleRemoteJsep({ jsep: jsep });
  
  // Check if any of the media we wanted to publish has
  // been rejected (e.g., wrong or unsupported codec)
  if(mystream && mystream.getAudioTracks() && mystream.getAudioTracks().length > 0 && !audio_codec) {
    // Audio has been rejected
    alert("Our audio stream has been rejected, viewers won't hear us")
    console.warning("Our audio stream has been rejected, viewers won't hear us");
  }

  if(mystream && mystream.getVideoTracks() && mystream.getVideoTracks().length > 0 && !video_codec) {
    // Hide the webcam video
    // TODO: handle hide webcam
  }
}


function onAttachVrMessage(msg, jsep){
  Janus.debug(" ::: Got a message (publisher) :::", msg);
  var event = msg["videoroom"];

  Janus.debug("Event: " + event);
  
  if(event) {
    if(event === "joined") {
      onJoin(msg)
    } else if(event === "destroyed") {
      onVideoRoomDestroyed(msg)
    } else if(event === "event") {
      handleVideRoomEvent(msg)
    }
  }
  if(jsep) {
    handleJsep(jsep, msg.audio_codec, msg.video_codec)
  }
}

function onVrLocalStream(stream){
  mystream = stream
  
  if($('#myvideo').length === 0) {
    $('#videolocal').append('<video class="rounded centered" id="myvideo" width="100%" height="100%" autoplay playsinline muted="muted"/>');
    // Add a 'mute' button
  }
  console.log("Received local stream")

  Janus.attachMediaStream($('#myvideo').get(0), stream);
  
  if(sfutest.webrtcStuff.pc.iceConnectionState !== "completed" &&
    sfutest.webrtcStuff.pc.iceConnectionState !== "connected") {

  }
  var videoTracks = stream.getVideoTracks();
  if(!videoTracks || videoTracks.length === 0) {
    // No webcam
    
    // TODO: handle no webcam
  } else {
    // TODO: show video container
  }
}

function newRemoteFeed(id, display, audio, video) {
  // A new feed has been published, create a new plugin handle and attach to it as a subscriber
  var remoteFeed = null;
  janusVr.attach(
    {
      plugin: "janus.plugin.videoroom",
      opaqueId: opaqueId,
      success: function(pluginHandle) {
        remoteFeed = pluginHandle;
        remoteFeed.simulcastStarted = false;
        Janus.log("Plugin attached! (" + remoteFeed.getPlugin() + ", id=" + remoteFeed.getId() + ")");
        Janus.log("  -- This is a subscriber");
        // We wait for the plugin to send us an offer
        var subscribe = {
          request: "join",
          room: roomName,
          ptype: "subscriber",
          feed: id,
          pin: ""+ roomPin,
          private_id: mypvtid
        };
        // In case you don't want to receive audio, video or data, even if the
        // publisher is sending them, set the 'offer_audio', 'offer_video' or
        // 'offer_data' properties to false (they're true by default), e.g.:
        // 		subscribe["offer_video"] = false;
        // For example, if the publisher is VP8 and this is Safari, let's avoid video
        if(Janus.webRTCAdapter.browserDetails.browser === "safari" &&
          (video === "vp9" || (video === "vp8" && !Janus.safariVp8))) {
          if(video)
            video = video.toUpperCase()
          toastr.warning("Publisher is using " + video + ", but Safari doesn't support it: disabling video");
          subscribe["offer_video"] = false;
        }
        remoteFeed.videoCodec = video;
        remoteFeed.send({ message: subscribe });
      },
      error: function(error) {
        Janus.error("  -- Error attaching plugin...", error);
        console.log("Error attaching plugin... " + error);
      },
      onmessage: function(msg, jsep) {
        Janus.debug(" ::: Got a message (subscriber) :::", msg);
        var event = msg["videoroom"];
        Janus.debug("Event: " + event);
        if(msg["error"]) {
          console.log(msg["error"]);
        } else if(event) {
          if(event === "attached") {
            // Subscriber created and attached
            for(var i=1;i<6;i++) {
              if(!feeds[i]) {
                feeds[i] = remoteFeed;
                remoteFeed.rfindex = i;
                break;
              }
            }
            remoteFeed.rfid = msg["id"];
            remoteFeed.rfdisplay = msg["display"];

            Janus.log("Successfully attached to feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") in room " + msg["room"]);
            $('#remote'+remoteFeed.rfindex).removeClass('hide').html(remoteFeed.rfdisplay).show();
          } else if(event === "event") {
            // Check if we got a simulcast-related event from this publisher
            var substream = msg["substream"];
            var temporal = msg["temporal"];
            if((substream !== null && substream !== undefined) || (temporal !== null && temporal !== undefined)) {
              if(!remoteFeed.simulcastStarted) {
                remoteFeed.simulcastStarted = true;
                // Add some new buttons
                addSimulcastButtons(remoteFeed.rfindex, remoteFeed.videoCodec === "vp8" || remoteFeed.videoCodec === "h264");
              }
              // We just received notice that there's been a switch, update the buttons
              updateSimulcastButtons(remoteFeed.rfindex, substream, temporal);
            }
          } else {
            // What has just happened?
          }
        }
        if(jsep) {
          Janus.debug("Handling SDP as well...", jsep);
          // Answer and attach
          remoteFeed.createAnswer(
            {
              jsep: jsep,
              // Add data:true here if you want to subscribe to datachannels as well
              // (obviously only works if the publisher offered them in the first place)
              media: { audioSend: false, videoSend: false },	// We want recvonly audio/video
              success: function(jsep) {
                Janus.debug("Got SDP!", jsep);
                var body = { request: "start", room: roomName };
                remoteFeed.send({ message: body, jsep: jsep });
              },
              error: function(error) {
                Janus.error("WebRTC error:", error);
                console.log("WebRTC error... " + error.message);
              }
            });
        }
      },
      iceState: function(state) {
        Janus.log("ICE state of this WebRTC PeerConnection (feed #" + remoteFeed.rfindex + ") changed to " + state);
      },
      webrtcState: function(on) {
        Janus.log("Janus says this WebRTC PeerConnection (feed #" + remoteFeed.rfindex + ") is " + (on ? "up" : "down") + " now");
      },
      onlocalstream: function(stream) {
        // The subscriber stream is recvonly, we don't expect anything here
      },
      onremotestream: function(stream) {
        console.log("Remote feed #" + remoteFeed.rfindex + ", stream:", stream);
        if(stream.getVideoTracks().length === 0){
          console.log("Stream has no video track")
        }
        if($('#remotevideo'+remoteFeed.rfindex).length === 0) {
          $('#videoremote-container').append('<div id="remotevideo-container'+ remoteFeed.rfindex + '"><video class="rounded centered relative" id="remotevideo' + remoteFeed.rfindex + '" width="100%" height="100%" autoplay playsinline/></div>')
          $("#remotevideo"+remoteFeed.rfindex).bind("playing")          
        }
        


        Janus.attachMediaStream($('#remotevideo'+remoteFeed.rfindex).get(0), stream);
        var videoTracks = stream.getVideoTracks();
        if(!videoTracks || videoTracks.length === 0) {
          // No remote video
          $('#remotevideo'+remoteFeed.rfindex).hide();
          if($('#videoremote'+remoteFeed.rfindex + ' .no-video-container').length === 0) {
            $('#videoremote'+remoteFeed.rfindex).append(
              '<div class="no-video-container">' +
              '<i class="fa fa-video-camera fa-5 no-video-icon"></i>' +
              '<span class="no-video-text">No remote video available</span>' +
              '</div>');
          }
        } else {
          $('#videoremote'+remoteFeed.rfindex+ ' .no-video-container').remove();
          $('#remotevideo'+remoteFeed.rfindex).removeClass('hide').show();
        }
      },
      oncleanup: function() {
        Janus.log(" ::: Got a cleanup notification (remote feed " + id + ") :::");
        if(remoteFeed.spinner)
          remoteFeed.spinner.stop();
        remoteFeed.spinner = null;
        $('#remotevideo'+remoteFeed.rfindex).remove();
        $('#waitingvideo'+remoteFeed.rfindex).remove();
        $('#novideo'+remoteFeed.rfindex).remove();
        $('#curbitrate'+remoteFeed.rfindex).remove();
        $('#curres'+remoteFeed.rfindex).remove();
        if(bitrateTimer[remoteFeed.rfindex])
          clearInterval(bitrateTimer[remoteFeed.rfindex]);
        bitrateTimer[remoteFeed.rfindex] = null;
        remoteFeed.simulcastStarted = false;
        $('#simulcast'+remoteFeed.rfindex).remove();
      }
    });
}
function publishOwnFeed(useAudio) {
  // Publish our stream
  sfutest.createOffer(
    {
      // Add data:true here if you want to publish datachannels as well
      media: { audioRecv: false, videoRecv: false, audioSend: useAudio, videoSend: true },	// Publishers are sendonly
      simulcast: true,
      simulcast2: true,
      success: function(jsep) {
        Janus.debug("Got publisher SDP!", jsep);
        var publish = { request: "configure", audio: useAudio, video: true };
        sfutest.send({ message: publish, jsep: jsep });
      },
      error: function(error) {
        Janus.error("WebRTC error:", error);
        if(useAudio) {
          publishOwnFeed(false);
        } else {
          console.log("WebRTC error... " + error.message);
          $('#publish').removeAttr('disabled').click(function() { publishOwnFeed(true); });
        }
      }
    });
}


function toggleMute() {
  var muted = sfutest.isAudioMuted();
  Janus.log((muted ? "Unmuting" : "Muting") + " local stream...");
  if(muted)
    sfutest.unmuteAudio();
  else
    sfutest.muteAudio();
  muted = sfutest.isAudioMuted();
  $('#mute').html(muted ? "Unmute" : "Mute");
}

function unpublishOwnFeed() {
  // Unpublish our stream
  var unpublish = { request: "unpublish" };
  sfutest.send({ message: unpublish });
  $('#videolocal').html('');
  
}

// Helpers to create Simulcast-related UI, if enabled
function addSimulcastButtons(feed, temporal) {
  var index = feed;
  $('#remote'+index).parent().append(
    '<div id="simulcast'+index+'" class="btn-group-vertical btn-group-vertical-xs pull-right">' +
    '	<div class"row">' +
    '		<div class="btn-group btn-group-xs" style="width: 100%">' +
    '			<button id="sl'+index+'-2" type="button" class="btn btn-primary" data-toggle="tooltip" title="Switch to higher quality" style="width: 33%">SL 2</button>' +
    '			<button id="sl'+index+'-1" type="button" class="btn btn-primary" data-toggle="tooltip" title="Switch to normal quality" style="width: 33%">SL 1</button>' +
    '			<button id="sl'+index+'-0" type="button" class="btn btn-primary" data-toggle="tooltip" title="Switch to lower quality" style="width: 34%">SL 0</button>' +
    '		</div>' +
    '	</div>' +
    '	<div class"row">' +
    '		<div class="btn-group btn-group-xs hide" style="width: 100%">' +
    '			<button id="tl'+index+'-2" type="button" class="btn btn-primary" data-toggle="tooltip" title="Cap to temporal layer 2" style="width: 34%">TL 2</button>' +
    '			<button id="tl'+index+'-1" type="button" class="btn btn-primary" data-toggle="tooltip" title="Cap to temporal layer 1" style="width: 33%">TL 1</button>' +
    '			<button id="tl'+index+'-0" type="button" class="btn btn-primary" data-toggle="tooltip" title="Cap to temporal layer 0" style="width: 33%">TL 0</button>' +
    '		</div>' +
    '	</div>' +
    '</div>'
  );
  // Enable the simulcast selection buttons
  $('#sl' + index + '-0').removeClass('btn-primary btn-success').addClass('btn-primary')
    .unbind('click').click(function() {
    toastr.info("Switching simulcast substream, wait for it... (lower quality)", null, {timeOut: 2000});
    if(!$('#sl' + index + '-2').hasClass('btn-success'))
      $('#sl' + index + '-2').removeClass('btn-primary btn-info').addClass('btn-primary');
    if(!$('#sl' + index + '-1').hasClass('btn-success'))
      $('#sl' + index + '-1').removeClass('btn-primary btn-info').addClass('btn-primary');
    $('#sl' + index + '-0').removeClass('btn-primary btn-info btn-success').addClass('btn-info');
    feeds[index].send({ message: { request: "configure", substream: 0 }});
  });
  $('#sl' + index + '-1').removeClass('btn-primary btn-success').addClass('btn-primary')
    .unbind('click').click(function() {
    toastr.info("Switching simulcast substream, wait for it... (normal quality)", null, {timeOut: 2000});
    if(!$('#sl' + index + '-2').hasClass('btn-success'))
      $('#sl' + index + '-2').removeClass('btn-primary btn-info').addClass('btn-primary');
    $('#sl' + index + '-1').removeClass('btn-primary btn-info btn-success').addClass('btn-info');
    if(!$('#sl' + index + '-0').hasClass('btn-success'))
      $('#sl' + index + '-0').removeClass('btn-primary btn-info').addClass('btn-primary');
    feeds[index].send({ message: { request: "configure", substream: 1 }});
  });
  $('#sl' + index + '-2').removeClass('btn-primary btn-success').addClass('btn-primary')
    .unbind('click').click(function() {
    toastr.info("Switching simulcast substream, wait for it... (higher quality)", null, {timeOut: 2000});
    $('#sl' + index + '-2').removeClass('btn-primary btn-info btn-success').addClass('btn-info');
    if(!$('#sl' + index + '-1').hasClass('btn-success'))
      $('#sl' + index + '-1').removeClass('btn-primary btn-info').addClass('btn-primary');
    if(!$('#sl' + index + '-0').hasClass('btn-success'))
      $('#sl' + index + '-0').removeClass('btn-primary btn-info').addClass('btn-primary');
    feeds[index].send({ message: { request: "configure", substream: 2 }});
  });
  if(!temporal)	// No temporal layer support
    return;
  $('#tl' + index + '-0').parent().removeClass('hide');
  $('#tl' + index + '-0').removeClass('btn-primary btn-success').addClass('btn-primary')
    .unbind('click').click(function() {
    toastr.info("Capping simulcast temporal layer, wait for it... (lowest FPS)", null, {timeOut: 2000});
    if(!$('#tl' + index + '-2').hasClass('btn-success'))
      $('#tl' + index + '-2').removeClass('btn-primary btn-info').addClass('btn-primary');
    if(!$('#tl' + index + '-1').hasClass('btn-success'))
      $('#tl' + index + '-1').removeClass('btn-primary btn-info').addClass('btn-primary');
    $('#tl' + index + '-0').removeClass('btn-primary btn-info btn-success').addClass('btn-info');
    feeds[index].send({ message: { request: "configure", temporal: 0 }});
  });
  $('#tl' + index + '-1').removeClass('btn-primary btn-success').addClass('btn-primary')
    .unbind('click').click(function() {
    toastr.info("Capping simulcast temporal layer, wait for it... (medium FPS)", null, {timeOut: 2000});
    if(!$('#tl' + index + '-2').hasClass('btn-success'))
      $('#tl' + index + '-2').removeClass('btn-primary btn-info').addClass('btn-primary');
    $('#tl' + index + '-1').removeClass('btn-primary btn-info').addClass('btn-info');
    if(!$('#tl' + index + '-0').hasClass('btn-success'))
      $('#tl' + index + '-0').removeClass('btn-primary btn-info').addClass('btn-primary');
    feeds[index].send({ message: { request: "configure", temporal: 1 }});
  });
  $('#tl' + index + '-2').removeClass('btn-primary btn-success').addClass('btn-primary')
    .unbind('click').click(function() {
    toastr.info("Capping simulcast temporal layer, wait for it... (highest FPS)", null, {timeOut: 2000});
    $('#tl' + index + '-2').removeClass('btn-primary btn-info btn-success').addClass('btn-info');
    if(!$('#tl' + index + '-1').hasClass('btn-success'))
      $('#tl' + index + '-1').removeClass('btn-primary btn-info').addClass('btn-primary');
    if(!$('#tl' + index + '-0').hasClass('btn-success'))
      $('#tl' + index + '-0').removeClass('btn-primary btn-info').addClass('btn-primary');
    feeds[index].send({ message: { request: "configure", temporal: 2 }});
  });
}

function updateSimulcastButtons(feed, substream, temporal) {
  // Check the substream
  var index = feed;
  if(substream === 0) {
    toastr.success("Switched simulcast substream! (lower quality)", null, {timeOut: 2000});
    $('#sl' + index + '-2').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#sl' + index + '-1').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#sl' + index + '-0').removeClass('btn-primary btn-info btn-success').addClass('btn-success');
  } else if(substream === 1) {
    toastr.success("Switched simulcast substream! (normal quality)", null, {timeOut: 2000});
    $('#sl' + index + '-2').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#sl' + index + '-1').removeClass('btn-primary btn-info btn-success').addClass('btn-success');
    $('#sl' + index + '-0').removeClass('btn-primary btn-success').addClass('btn-primary');
  } else if(substream === 2) {
    toastr.success("Switched simulcast substream! (higher quality)", null, {timeOut: 2000});
    $('#sl' + index + '-2').removeClass('btn-primary btn-info btn-success').addClass('btn-success');
    $('#sl' + index + '-1').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#sl' + index + '-0').removeClass('btn-primary btn-success').addClass('btn-primary');
  }
  // Check the temporal layer
  if(temporal === 0) {
    toastr.success("Capped simulcast temporal layer! (lowest FPS)", null, {timeOut: 2000});
    $('#tl' + index + '-2').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#tl' + index + '-1').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#tl' + index + '-0').removeClass('btn-primary btn-info btn-success').addClass('btn-success');
  } else if(temporal === 1) {
    toastr.success("Capped simulcast temporal layer! (medium FPS)", null, {timeOut: 2000});
    $('#tl' + index + '-2').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#tl' + index + '-1').removeClass('btn-primary btn-info btn-success').addClass('btn-success');
    $('#tl' + index + '-0').removeClass('btn-primary btn-success').addClass('btn-primary');
  } else if(temporal === 2) {
    toastr.success("Capped simulcast temporal layer! (highest FPS)", null, {timeOut: 2000});
    $('#tl' + index + '-2').removeClass('btn-primary btn-info btn-success').addClass('btn-success');
    $('#tl' + index + '-1').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#tl' + index + '-0').removeClass('btn-primary btn-success').addClass('btn-primary');
  }
}
