'use strict';

import React, {
  AppRegistry,
  Component,
  AsyncStorage,
  Alert,
  NativeModules
} from 'react-native';
import WebRTC, {
  RTCPeerConnection,
  RTCMediaStream,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  RTCSetting,
} from 'react-native-webrtc';
import {
  Analytics,
  Hits as GAHits,
} from 'react-native-google-analytics';
import DeviceInfo from 'react-native-device-info';
import MainView from './view/MainView';

window.navigator.userAgent = 'react-native';
let io = require('socket.io-client/socket.io');
let isocountry = require('./js/isocountry');

/* Native modules */
let AppKey = NativeModules.Key;
let MicCheck = NativeModules.MicCheck;

/* Analytics */
const TRACKING_ID = 'UA-75025059-2';
let ga = null;

/* Permanent storage keys */
const REV = '24'
const STORAGE_FRESH = '@PearStorage:fresh' + REV;
const STORAGE_MIC = '@PearStorage:mic' + REV;
const STORAGE_LOC = '@PearStorage:loc' + REV;
const STORAGE_UPT = '@PearStorage:upt' + REV;

/* Server */
const URL = 'https://stark-plains-31370.herokuapp.com/api/webrtc';

/* Set up & Initialize global variables */
const pcPeers = {};
let myPC;
let localStream;
let socket;
let component;
let tempPeerLoc;
const PC_CONFIG = {"iceServers": [{url:'stun:stun01.sipphone.com'},
                                  {url:'stun:stun.services.mozilla.com'},
                                  {url:'stun:stun.fwdnet.net'},
                                  {url:'stun:stun.ekiga.net'},
                                  {url:'stun:stun.iptel.org'},
                                  {url:'stun:stun.schlund.de'},
                                  {url:'stun:stun.l.google.com:19302'},
                                  {url:'stun:stun1.l.google.com:19302'},
                                  {url:'stun:stun2.l.google.com:19302'},
                                  {url:'stun:stun3.l.google.com:19302'},
                                  {url:'stun:stun4.l.google.com:19302'}]};

function createPC(socketId, isOffer) {
  let pc = new RTCPeerConnection(PC_CONFIG);
  pcPeers[socketId] = pc;

  function createOffer() {
    pc.createOffer(desc => {
      pc.setLocalDescription(desc, () => {
        socket.emit('exchange', {'to': socketId, 'sdp': pc.localDescription});
        socket.emit('lochange', {'to': socketId, 'loc': component.state.loc, 'offer': true});
      }, logError);
    }, logError);
  }

  pc.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('exchange', {'to': socketId, 'candidate': event.candidate});
    }
  };
  pc.onnegotiationneeded = () => {
    if (isOffer) {
      createOffer();
    }
  };
  pc.oniceconnectionstatechange = event => {
    console.log('oniceconnectionstatechange', event.target.iceConnectionState);
    if (event.target.iceConnectionState === 'connected' || 
        event.target.iceConnectionState === 'completed') {
      if (!component.state.peerLoc) {   /* Prevent hitting both 'connected' and 'completed' */
        socket.disconnect();
        clearInterval(component.refs.mainView.state.emojiInterval);
        component.refs.mainView.callTimeIntervalStart();
        component.setState({peerLoc: tempPeerLoc});
      }
    } else if (event.target.iceConnectionState === 'disconnected') {
      component.refs.mainView.onMainViewHangupButtonPressed();
    }
  };
  pc.onsignalingstatechange = event => {
    // console.log('onsignalingstatechange', event.target.signalingState);
  };
  pc.onaddstream = event => {
    // component.setState({remoteSrc: event.stream.toURL()});
  };

  pc.addStream(localStream);
  return pc;
}

function exchange(data) {
  let fromId = data.from;
  if (fromId in pcPeers) {
    myPC = pcPeers[fromId];
  } else {
    myPC = createPC(fromId, false);
  }

  if (data.sdp) {
    myPC.setRemoteDescription(new RTCSessionDescription(data.sdp), () => {
      if (myPC.remoteDescription.type == "offer") {
        myPC.createAnswer(desc => {          
          myPC.setLocalDescription(desc, () => {
            socket.emit('exchange', {'to': fromId, 'sdp': myPC.localDescription});
          }, logError);
        }, logError);
      }
    }, logError);
  } else {
    myPC.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
}

function join(roomId) {
  socket.emit('join', roomId, socketIds => {
    for (let i in socketIds) {
      createPC(socketIds[i], true);
    }
  });
}

function getLocalStream(callback) {
  let constraints = {video: false, audio: true};
  navigator.getUserMedia(constraints, stream => {
    callback(stream);
  }, logError);
}

function hangup() {
  /* Disconnect from server */
  socket.disconnect();

  /* Close peer connection and delete them */
  for (let socketId in pcPeers) {
    pcPeers[socketId].close();
    delete pcPeers[socketId];
  }
  myPC = null;

  /* Hangup setting */
  RTCSetting.setProximityScreenOff(false);
  RTCSetting.setKeepScreenOn(false);
}

function call() {
  getLocalStream(stream => {
    localStream = stream;
    join({room: makeRoomId()});
  });

  /* Set call settings */
  RTCSetting.setAudioOutput('handset');
  RTCSetting.setProximityScreenOff(true);
  RTCSetting.setKeepScreenOn(true);
}

function listen() {
  socket.on('connect_error', data => {
    console.log('connect error', data);
    component.refs.mainView.onMainViewHangupButtonPressed();
    Alert.alert('Error 😓', 'Please try again.');
  });

  socket.on('connect', data => {
    call();
  });

  socket.on('exchange', data => {
    exchange(data);
  });

  socket.on('lochange', data=> {
    tempPeerLoc = isocountry(data.loc);
    if (data.offer) {
      socket.emit('lochange', {'to': data.from, 'loc': component.state.loc, 'offer': false});
    }
  });
}

function makeRoomId() {
  let text = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 10; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function logError(error) {
  console.log('logError', error);
}

class Pear extends Component {
  constructor(props) {
    super(props);
    this.state = {
      calling: false,

      fresh: false,
      micPermission: 'YES',
      loc: '',
      peerLoc: '',

      micMuted: false,
      speakerOn: false,
    };
  }

  componentDidMount() {
    console.log('mount');
    component = this;
    this._checkFreshAndMicState().done;
    this._checkAndUpdateUptAndLocState().done;
    ga = new Analytics(TRACKING_ID, 
                       DeviceInfo.getUniqueID(), 
                       DeviceInfo.getReadableVersion(), 
                       DeviceInfo.getUserAgent());
  }

  /* Helper functions */
  _getLoc(callback) {
    let url = 'http://ipinfo.io/country';
    fetch(url).then(res => {
      return res.text();
    }).then(body => {
      if (body.trim().length != 2) {
        callback();
      } else {
        callback(body.trim());
      }
    });
  }

  /* Async storage methods */
  async _checkFreshAndMicState() {
    console.log('_checkFreshAndMicState');
    try {
      let freshValue = await AsyncStorage.getItem(STORAGE_FRESH);
      let micValue = await AsyncStorage.getItem(STORAGE_MIC);
      /* First-ever loading */
      if (!freshValue) {
        this.setState({fresh: true, micPermission: 'NO'});
        await AsyncStorage.setItem(STORAGE_FRESH, new Date().toString());
        await AsyncStorage.setItem(STORAGE_MIC, 'NO');
      } else {
        /* Subsequent loading */
        if (this.state.micPermission !== micValue) {
          this.setState({micPermission: micValue});
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  async _checkAndUpdateUptAndLocState() {
    console.log('_checkAndUpdateUptAndLocState');
    try {
      let uptValue = await AsyncStorage.getItem(STORAGE_UPT);
      if ((new Date() - new Date(uptValue)) > 3600000) {
        console.log('update loc state');
        await this._getLoc(currLoc => {
          if (currLoc) {
            let currTime = new Date().toString();
            AsyncStorage.setItem(STORAGE_LOC, currLoc);
            AsyncStorage.setItem(STORAGE_UPT, currTime);
            if (this.state.loc !== currLoc) {
              this.setState({loc: currLoc});
            }
          }
        });
      } else {
        if (!this.state.loc) {
          console.log('retrieve loc state');
          let locValue = await AsyncStorage.getItem(STORAGE_LOC);
          this.setState({loc: locValue});
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  async _updateMicState() {
    console.log('_updateMicState');
    try {
      await AsyncStorage.setItem(STORAGE_MIC, 'YES');
      this.setState({micPermission: 'YES'});
    } catch (error) {
      console.log(error);
    }
  }

  render() {
    return (<MainView calling={this.state.calling} 
                      peerLoc={this.state.peerLoc}
                      fresh={this.state.fresh}
                      micMuted={this.state.micMuted}
                      speakerOn={this.state.speakerOn}
                      onCallButtonPressed={this.onCallButtonPressed.bind(this)}
                      onHangupButtonPressed={this.onHangupButtonPressed.bind(this)}
                      onMuteButtonPressed={this.onMuteButtonPressed.bind(this)}
                      onSpeakerButtonPressed={this.onSpeakerButtonPressed.bind(this)}
                      onWelcomeButtonPressed={this.onWelcomeButtonPressed.bind(this)}
                      ref='mainView'/>);
  }

  /* Button events */
  onWelcomeButtonPressed() {
    this.setState({fresh: false});
  }

  onCallButtonPressed() {
    this.setState({calling: true, micMuted: false, speakerOn: false, peerLoc: ''}, () => {
      AppKey.getKey((error, key) => {
        if (error) {
          Alert.alert('Error 😵', 'Something went horribly wrong. Please let us know at contact@pearvoice.com');
        } else {
          socket = io(URL, { query: 'secret='+key, forceNew: true });
          listen();
          let screenView = new GAHits.ScreenView('Pear', 'Test Screen', '0.0.1', 'com.pearvoice.app');
          let gaEvent = new GAHits.Event('Audio', 'call');
          ga.send(screenView);
        }
      });
    });
  }

  onHangupButtonPressed() {
    this.setState({calling: false}, () => {
      hangup();
    });
  } 

  onMuteButtonPressed() {
    if (myPC) {
      if (this.state.micMuted) {
        this.setState({micMuted: false}, () => {
          myPC.addStream(localStream);
        });
      } else {
        this.setState({micMuted: true}, () => {
          myPC.removeStream(localStream);
        });
      }
    }
  }

  onSpeakerButtonPressed() {
    if (this.state.speakerOn) {
      this.setState({speakerOn: false}, () => {
        RTCSetting.setAudioOutput('handset');
      });
    } else {
      this.setState({speakerOn: true}, () => {
        RTCSetting.setAudioOutput('speaker');
      });
    }
  }
}

AppRegistry.registerComponent('Pear', () => Pear);

