class AviotCopter {
    
    constructor(copterId, token, endpoint){
      this.copterId = copterId
      this.callbacks = {}      
      this._onConnect = this._onConnect.bind(this)
      this.__emit = this.__emit.bind(this)

      this.socket = io(endpoint)
      this.socket.on('connect', this._onConnect)
      this.socket.on('error', this._onError)

    }
  
    getCopterId(){
      return this.copterId
    }
    on(event, cb){
      if(!this.callbacks[event]){
        this.callbacks[event] = [];
      }
      this.callbacks[event].push(cb)
    }
  
    _emit(event, data){
      let cbs = this.callbacks[event]
      if(cbs){
          cbs.forEach(cb => cb(data))
      }
    }
    __emit(event){
      return function(data) {
        this._emit(event, data)
      }.bind(this)
    }
    _onError(error){
      console.log(error)
      this._emit('error', error)
    }
    _onConnect(){
      this.socket.emit('connect_to_copter', 'mavros')
      this.socket.on(`/${this.copterId}/battery`, this.__emit('battery'))
      this.socket.on(`/${this.copterId}/state`, this.__emit('state'))
      this.socket.on(`/${this.copterId}/global_position/global`, this.__emit('global_position'))
      this.socket.on(`/${this.copterId}/global_position/rel_alt`, this.__emit('relative_altitude'))
      this._emit('connect', {status: 'connected'})
    }
    armThrottle(){
      this.socket.emit('arm', {copterId: this.copterId})
    }
    takeoff(lat, lng, alt) {
      console.log('taking off');
      this.socket.emit('takeoff', {copterId: this.copterId, latitude: lat, longitude: lng, altitude: alt})
    }
    land(lat, lng, alt){
      this.socket.emit('land', {copterId: this.copterId, latitude: lat, longitude: lng, altitude: alt} )
    
    }
    cmdVel(linear={x:0, y:0, z:0}, angular={x:0, y:0, z:0}){
      this.socket.emit('cmd_vel', {copterId: this.copterId, linear: linear, angular: angular})
    }
  }