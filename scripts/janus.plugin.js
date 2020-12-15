import Janus from './janus.js';

/*
 * This class represents the basic handler for the janus plugins.
 */
export default class JanusPlugin {

    /*
     * [Overload] Plugin name
     */
    pluginName() {
        return 'janus.plugin.name';
    }

    /*
     * Constructor
     */
    constructor(options={}) {
        
        /* Janus instance */
        this.janus = null;
        this.janusLogLevel = "none";

        /* Plugin */
        this.janusPlugin = null;   
        
        /* Options & callbacks */ 
        this.callbacks = options;       
        if ("logLevel" in options && (options.logLevel !== null || options.logLevel !== undefined)) {
            this.janusLogLevel = options.logLevel;
            delete this.callbacks.logLevel;
        }
    }

    /*
     * Initialize a new Janus instance
     */
    init(janus_server, janus_token, janus_apisecret=null) {

        /* Self instance */
        let self = this;
        
        /* Initialize the instance */
        Janus.init({
            debug: self.janusLogLevel, 
            callback: function() {

				/* DEBUG */
				Janus.debug("::: Initialized a new Janus instance :::");

                /* Session options */
                let options = {
                    server: janus_server,
                    success: self._onSuccess(),
                    error: self._onError(),
                    destroyed: self._onDestroyed()
                }

                /* [Optional] Token */
                if (janus_token !== null) {
                    options["token"] = janus_token;
                }

                /* [Optional] ApiSecret */
                if (janus_apisecret !== null) {
                    options["apisecret"] = janus_apisecret;
                }

                /* Janus session */
                self.janus = new Janus(options);
            }
        });        
    }

    /*
     * [Private] Handle Janus connection
     */
    _onSuccess() {

        /* Self instance */
        let self = this;

		/* DEBUG */
		Janus.debug("::: Attaching the plugin :::");

        /* Request to attach the plugin */
		return function() {

            /* Plugin info */
            let pluginName = self.pluginName();
            let pluginOpaqueId = pluginName.split(".")[2];

			/* Attach */
			self.janus.attach({
				plugin: pluginName,
				opaqueId: pluginOpaqueId + Janus.randomString(12),
				success: function(pluginHandle) {
					
					/* DEBUG */
					Janus.debug("::: Plugin attached :::");
    
                    /* Store the plugin object */
                    self.janusPlugin = pluginHandle;
                    
                    /* [REQUIRED] Callback for Janus ready */
                    self.callbacks.onReady();
                },
                error: self._onError(),
                consentDialog: self._onConsentDialog(),
                webrtcState: self._onWebRtcState(),
                iceState: self._onIceState(),
                mediaState: self._onMediaState(),
                slowLink: self._onSlowLink(),
                onmessage: self._onMessage(),
                onlocalstream: self._onLocalStream(),                
                onremotestream: self._onRemoteStream(),
                ondataopen: self._onDataOpen(),
                ondata: self._onDataReceive(),
                oncleanup: self._onCleanup()
			});
		}        
    }

    /*
     * [Private] Handle Janus error
     */
    _onError() {

        /* Self instance */
        let self = this;

        return function(error) {
            Janus.error(error);

            /* [REQUIRED] Callback for errors */
            self.callbacks.onError(error)
        }
    }

    /*
     * [Private] Handle Janus session destroyed
     */
    _onDestroyed() {
        return function() {
            Janus.info("::: Janus session was destroyed :::");
        }
    }

    /*
     * [Private] Handle Janus consent dialog (Overload)
     */
    _onConsentDialog() {
        return function(on) {
            // OVERLOAD THIS
        }
    }

    /*
     * [Private] Handle Janus Web RTC state (Overload)
     */
    _onWebRtcState() {
        return function(on) {
            // OVERLOAD THIS
        }
    }

    /*
     * [Private] Handle Janus ICE state (Overload)
     */
    _onIceState() {
        return function(state) {
            // OVERLOAD THIS
        }
    }

    /*
     * [Private] Handle Janus media state (Overload)
     */
    _onMediaState() {
        return function(medium, on) {
            // OVERLOAD THIS
        }
    }

    /*
     * [Private] Handle Janus slow link
     */
    _onSlowLink() {
        return function(uplink, lost) {
            // OVERLOAD THIS
        }
    }

    /*
     * [Private] Handle Janus messages (Overload)
     */
    _onMessage() {
        return function(message, jsep) {
            // OVERLOAD THIS
        }        
    }

    /*
     * [Private] Handle Janus local stream (Overload)
     */
    _onLocalStream() {
        return function(stream) {
            // OVERLOAD THIS
        }
    }

    /*
     * [Private] Handle Janus remote stream (Overload)
     */
    _onRemoteStream() {
        return function(stream) {
            // OVERLOAD THIS
        }
    }

    /*
     * [Private] Handle Janus available data channel (Overload)
     */
    _onDataOpen() {
        return function(data) {
            // OVERLOAD THIS
        }
    }

    /*
     * [Private] Handle Janus data received (Overload)
     */
    _onDataReceive() {
        return function(data) {
            // OVERLOAD THIS
        }
    }

    /*
     * [Private] Handle Janus plugin closing (Overload)
     */
    _onCleanup() {
        return function() {
            // OVERLOAD THIS
        }
    }
}