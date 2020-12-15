import Janus from './janus.js';
import JanusPlugin from './janus.plugin.js';

/*
 * This class represents the handler for the streaming plugin of Janus
 */
export default class JanusStreaming extends JanusPlugin {

    /*
     * [Overload] Plugin name
     */
    pluginName() {
        return 'janus.plugin.streaming';
    }

    /*
     * [Private] Handle Janus messages (Overload)
     */
    _onMessage() {

        /* Self instance */
        let self = this;

        return function(message, jsep) {

            /* Check for events */
            if ("streaming" in message && message.streaming === "event") {

                /* Triggered error */
                if ("error" in message && message.error !== null) {
                    self.callbacks.onError(message.error);
                }
                else if ("result" in message && message.result !== null) {
                    if ("status" in message.result && message.result.status !== null) {

                        /* Check the status */
                        let status = message.result.status;
                        if (status === "preparing") {

                            /* Callback */
                            if ("onStreamPrepare" in self.callbacks && typeof(self.callbacks.onStreamPrepare) === "function") {

                                /* Obtain the video selector */
                                self.callbacks.onStreamPrepare();
                            }

                        } else if (status === "starting") {

                            /* Callback */
                            if ("onStreamStarting" in self.callbacks && typeof(self.callbacks.onStreamStarting) === "function") {

                                /* Run */
                                self.callbacks.onStreamStarting();
                            }

                        } else if (status === "started") {

                            /* Callback */
                            if ("onStreamStarted" in self.callbacks && typeof(self.callbacks.onStreamStarted) === "function") {

                                /* Run */
                                self.callbacks.onStreamStarted();
                            }
                        }
                    }
                }
            }

            if (jsep !== undefined && jsep !== null) {                
                self.janusPlugin.createAnswer({
                    jsep: jsep,
                    media: { audioSend: false, videoSend: false },
                    success: function(jsep) {
                        let body = { "request": "start" };
                        self.janusPlugin.send({ "message": body, "jsep": jsep });
                    }
                });
            }
        }
    }
    
    /*
     * [Private] Handle Janus remote stream (Overload)
     */
    _onRemoteStream() {

        /* Self instance */
        let self = this;

        return function(stream) {

            /* Callback */
            if ("onRemoteStream" in self.callbacks && typeof(self.callbacks.onRemoteStream) === "function") {

                /* Run */
                self.callbacks.onRemoteStream(stream);

            } else {

                /* DEBUG the callback error */
                Janus.error("::: Got the stream but we don't have any callback for it :::");
            }
        }
    }

    /* 
     * [Exposed] Watch the stream
     */
    watch(id, pin = null) {

        /* Request */
        let body = 
        { 
            "request": "watch", 
            id: parseInt(id) 
        };

        /* Pin is required ? */
        if (pin !== null) {
            body["pin"] = pin.toString();
        }

        /* Send request */
        if (this.janusPlugin !== null) {
            this.janusPlugin.send({ "message": body });
        }
	}
	
	/*
	 * [Exposed] Stop watching the stream
	 */
	stop() {

		/* Request */
        let body = { "request": "stop" };
        
        /* Send request */
        if (this.janusPlugin !== null) {
		    this.janusPlugin.send({ "message": body });
            this.janusPlugin.hangup();
        }
	}   
}