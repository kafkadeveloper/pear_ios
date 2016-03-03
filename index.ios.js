'use strict';

import React, {
  AppRegistry,
  Component,
  StyleSheet,
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableHighlight,
  Image,
  AsyncStorage,
  DeviceEventEmitter,
  Animated,
  VibrationIOS,
  StatusBarIOS,
} from 'react-native';
import WebRTC, {
  RTCPeerConnection,
  RTCMediaStream,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  RTCSetting,
} from 'react-native-webrtc';
import DeviceInfo from 'react-native-device-info';
import Animatable from 'react-native-animatable';
window.navigator.userAgent = 'react-native';
let io = require('socket.io-client/socket.io');
let isocountry = require('./js/isocountry.js');

/* Permanent storage keys */
const REV = '22'
const STORAGE_FRESH = '@PearStorage:fresh' + REV;
const STORAGE_MIC = '@PearStorage:mic' + REV;
const STORAGE_LOC = '@PearStorage:loc' + REV;
const STORAGE_UPT = '@PearStorage:upt' + REV;

/* Color palette */
const RED = '#ff6169';
const BLUE = '#26476b';
const GREY = '#e0e0e0';
const RED_RGBA = 'rgba(255, 97, 105, x)';
const BLUE_RGBA = 'rgba(38, 71, 107, x)';

/* Set up & Initialize global variables */
const pcPeers = {};
let localStream;
let socket;
let component;
let tempPeerLoc;
const PC_CONFIG = {"iceServers": [{"url": "stun:stun.l.google.com:19302"},
                                  {"url": "stun:stun.services.mozilla.com"}]};


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
      if (!component.state.peerLoc) {   /* Prevent hitting both connected and completed */
        socket.disconnect();
        component.callTimeIntervalStart();
        component.setState({peerLoc: tempPeerLoc});
        VibrationIOS.vibrate();
      }
    } else if (event.target.iceConnectionState === 'disconnected') {
      component.onHangupButtonPressed();
    }
  };
  pc.onsignalingstatechange = event => {
    // console.log('onsignalingstatechange', event.target.signalingState);
  };
  pc.onaddstream = event => {
    // component.setState({remoteSrc: event.stream.toURL()});
    // add stream to state
  };

  pc.addStream(localStream);
  return pc;
}

function exchange(data) {
  let fromId = data.from;
  let pc;
  if (fromId in pcPeers) {
    pc = pcPeers[fromId];
  } else {
    pc = createPC(fromId, false);
  }

  // if (data.candidate) {
  //   console.log('exchange', data.candidate.candidate.split(' ')[4]);
  // }

  if (data.sdp) {
    pc.setRemoteDescription(new RTCSessionDescription(data.sdp), () => {
      if (pc.remoteDescription.type == "offer") {
        pc.createAnswer(desc => {          
          pc.setLocalDescription(desc, () => {
            socket.emit('exchange', {'to': fromId, 'sdp': pc.localDescription});
          }, logError);
        }, logError);
      }
    }, logError);
  } else {
    pc.addIceCandidate(new RTCIceCandidate(data.candidate));
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

function logError(error) {
  console.log('logError', error);
}

function hangup() {
  /* Disconnect from server */
  socket.disconnect();

  /* Close peer connection and delete them */
  for (let socketId in pcPeers) {
    pcPeers[socketId].close();
    delete pcPeers[socketId];
  }

  /* Hangup setting */
  StatusBarIOS.setNetworkActivityIndicatorVisible(false);
  RTCSetting.setProximityScreenOff(false);
  RTCSetting.setKeepScreenOn(false);
  // TODO unmute

  component.setState({buttonAble: true});
}

function call() {
  getLocalStream(stream => {
    localStream = stream;

    let info = DeviceInfo.getReadableVersion() + '@' +
               DeviceInfo.getUniqueID() + '@' +
               DeviceInfo.getDeviceLocale() + '@' +
               component.state.loc;

    join({room: makeRoomId(), info: info});
    component.setState({buttonAble: true});
  });

  /* Set call settings */
  StatusBarIOS.setNetworkActivityIndicatorVisible(true);
  RTCSetting.setAudioOutput('handset');
  RTCSetting.setProximityScreenOff(true);
  RTCSetting.setKeepScreenOn(true);
}

function listen() {
  // is this the right way to do this?
  socket.on('connect_error', data => {
    console.log('connect error', data);
    component.onHangupButtonPressed();
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

function getLoc(callback) {
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

function makeRoomId() {
  let text = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 10; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

class Pear extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fresh: false,
      micPermission: 'YES',
      loc: null,

      bgOverlayColor: RED,

      calling: false,
      buttonAble: true,
      // remoteSrc: null,

      micMuted: false,
      speakerOn: false,

      peerLoc: '',
      callStartTime: null,
      callDeltaTime: 'calling...',
      callInterval: null,
    };
  }

  componentDidMount() {
    console.log('mount');
    component = this;
    this._checkFreshAndMicState().done;
    this._checkAndUpdateUptAndLocState().done;
  }

  componentWillUnmount() {
    console.log('unmount');
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
        await getLoc(currLoc => {
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
  }  /* Async storage methods end */

  render() {
    /* Loading screen */
    // if (this.state.loading) {
    //   return this.renderLoadingView();
    // }
    /* Welcome screen */
    if (this.state.fresh) {
      return this.renderWelcomeView(); // TODO make it slide in from bottom and slide down
    }
    /* Permission screen */
    // if (this.state.micPermission !== 'YES') {  // TODO make a modal view for this and show at call
    //   return this.renderPermissionView();
    // }
    /* Main view */
    if (this.state.calling) {
      return this.renderHangupView();
    } else {
      return this.renderCallView();
    }
  }

  /* Render methods */
  renderLoadingView() {
    return (
      <View style={styles.container}>
      </View>
    );
  }

  renderWelcomeView() {
    return (
      <View style={styles.container}>
        <View style={{flex: 0.5, justifyContent: 'center', alignItems:'center'}}>
          <Text style={{alignSelf: 'center', color:'white', fontSize:30}}>Welcome screen</Text>
        </View>
        <View style={{flex: 0.5, justifyContent: 'center', alignItems:'center'}}>
          <TouchableHighlight style={{width: 200, height: 40, alignItems:'center',justifyContent:'center', borderWidth:1, borderColor:'white', borderRadius:13, backgroundColor: 'transparent'}}
                              underlayColor={GREY}
                              onPress={this.onWelcomeButtonPressed.bind(this)}>
            <Text style={{color: 'white', fontSize: 18}}>Let's get started 😀</Text>
          </TouchableHighlight>
        </View>
      </View>
    );
  }

  renderPermissionView() {
    return (
      <View style={styles.container}>
        <Text>Permission</Text>
      </View>
    );
  }

  renderMainView() {
    return (
      <View style={styles.container}>
        <View style={{flex: 1, flexDirection: 'column', backgroundColor: this.state.bgOverlayColor}}>
          <View style={styles.topContainer}>
          </View>
          <View style={styles.middleContainer}>
          </View>
          <View style={styles.divideContainer}>
          </View>
          <View style={styles.bottomContainer}>
          </View>
        </View>
      </View>
    );
  }

  renderCallView() {
    return (
      <View style={styles.container}>
        <View style={{flex: 1, flexDirection: 'column', backgroundColor: this.state.bgOverlayColor}}>
          <View style={styles.topContainer}>
          </View>
          <View style={styles.middleContainer}>
          </View>
          <View style={styles.divideContainer}></View>
          <Animatable.View style={styles.bottomContainer} animation="bounceIn" ref="aniviewcall">
            <TouchableHighlight style={styles.circleButton}
                                underlayColor={GREY}
                                onPress={this.state.buttonAble ? this.onCallButtonPressed.bind(this) : null}>
              <Image source={require('image!call')} style={{width: 30, height: 30,}} />
            </TouchableHighlight>
          </Animatable.View>
        </View>
      </View>
    );
  }

  renderHangupView() {
    return (
      <View style={styles.container}>
        <View style={{flex: 1, flexDirection: 'column', backgroundColor: this.state.bgOverlayColor}}>
          <View style={styles.topContainer}>
            <View style={styles.divideContainerx2}></View>
            <View style={styles.divideContainerx2}></View>
            <View style={styles.flagTextContainer}>
              <Animatable.Text style={styles.flagText} animation="bounceIn" ref="aniviewflag">
                {this.state.peerLoc}
              </Animatable.Text>
            </View>
            <View style={styles.divideContainer}></View>
            <View style={styles.deltaTextContainer}>
              <Animatable.Text style={styles.deltaText} animation="bounceInDown" ref="aniviewdelta">
                {this.state.callDeltaTime}
              </Animatable.Text>
            </View>
          </View>
          <Animatable.View style={styles.middleContainer} animation="bounceIn" ref="aniviewopt">
            {this.renderMuteButton()}
            {this.renderSpeakerButton()}
          </Animatable.View>
          <View style={styles.divideContainer}></View>
          <Animatable.View style={styles.bottomContainer} animation="bounceInUp" ref="aniviewhang">
            <TouchableHighlight style={styles.circleButton}
                                underlayColor={GREY}
                                onPress={this.state.buttonAble ? this.onHangupButtonPressed.bind(this) : null}>
              <Image source={require('image!hangup')} style={{width: 36, height: 36,}} />
            </TouchableHighlight>
          </Animatable.View>
        </View>
      </View>
    );
  } 

  renderMuteButton() {
    if (this.state.micMuted) {
      return (
        <TouchableHighlight style={styles.audioControlButtonOn}
                            underlayColor={GREY}
                            onPress={this.onMuteButtonPressed.bind(this)}>
          <Image source={require('image!muteOn')} style={{width: 17, height: 20,}} />
        </TouchableHighlight>
      );
    } else {
      return (
        <TouchableHighlight style={styles.audioControlButtonOff}
                            underlayColor={GREY}
                            onPress={this.onMuteButtonPressed.bind(this)}>
          <Image source={require('image!muteOff')} style={{width: 17, height: 20,}} />
        </TouchableHighlight>
      );
    }
  }

  renderSpeakerButton() {
    if (this.state.speakerOn) {
      return (
        <TouchableHighlight style={styles.audioControlButtonOn}
                            underlayColor={GREY}
                            onPress={this.onSpeakerButtonPressed.bind(this)}>
          <Image source={require('image!speakerOn')} style={{width: 20, height: 20,}} />
        </TouchableHighlight>
      );
    } else {
      return (
        <TouchableHighlight style={styles.audioControlButtonOff}
                            underlayColor={GREY}
                            onPress={this.onSpeakerButtonPressed.bind(this)}>
          <Image source={require('image!speakerOff')} style={{width: 20, height: 20,}} />
        </TouchableHighlight>
      );
    }
  }  /* Render methods end */

  /* Button event */
  onWelcomeButtonPressed() {
    this.setState({fresh: false});
  }

  linearGradualBackgroundShiftRed(callback) {
    let d = 0.9;

    let gradientInterval = setInterval(() => {
      if (d < 0) {
        clearInterval(gradientInterval);
        callback();
      } else {
        this.setState({bgOverlayColor: BLUE_RGBA.replace('x', d)});
      }
      d -= 0.05;
    }, 30);
  }

  linearGradualBackgroundShiftBlue(callback) {
    let d = 0.1;

    let gradientInterval = setInterval(() => {
      if (d > 1) {
        clearInterval(gradientInterval);
        callback();
      } else {
        this.setState({bgOverlayColor: BLUE_RGBA.replace('x', d)});
      }
      d += 0.05;
    }, 30);
  }

  callTimeIntervalStart() {
    this.setState({callDeltaTime: '00:00'});
    this.setState({
      callStartTime: new Date(),
      callInterval: setInterval(() => { 
        let mss = Math.floor((new Date() - this.state.callStartTime) / 1000);
        let secs = mss % 60;
        let minutes = Math.floor(mss / 60);
        secs > 9 ? secs = secs.toString() : secs = '0' + secs.toString();
        minutes > 9 ? minutes = minutes.toString() : minutes = '0' + minutes.toString();
        this.setState({callDeltaTime: minutes + ':' + secs});
      }, 1000),
    });
  }

  onCallButtonPressed() {
    this.setState({buttonAble: false});

    /* UI change */
    this.refs.aniviewcall.zoomOutDown(600).then( endstate => {});
    this.linearGradualBackgroundShiftBlue(() => {
      this.setState({calling: true, callingDeltaTime: 'calling...'});
      socket = io('https://stark-plains-31370.herokuapp.com/api/webrtc', { query: 'secret=abcde', forceNew: true });
      listen();
    });
  }

  onHangupButtonPressed() {
    this.setState({buttonAble: false});

    /* UI change */
    this.refs.aniviewflag.zoomOut(600).then( endstate => {});
    this.refs.aniviewdelta.zoomOut(600).then( endstate => {});
    this.refs.aniviewopt.zoomOut(600).then( endstate => {});
    this.refs.aniviewhang.zoomOut(600).then( endstate => {});
    this.linearGradualBackgroundShiftRed(() => {
      clearInterval(this.state.callInterval);
      this.setState({calling: false, 
                     micMuted: false,
                     speakerOn: false,
                     peerLoc: ''});
      hangup();
    });
  } 

  onMuteButtonPressed() {
    if (this.state.micMuted) {
      // unMute
      this.setState({micMuted: false});
    } else {
      // mute
      console.log(localStream);
      this.setState({micMuted: true});
    }
  }

  onSpeakerButtonPressed() {
    if (this.state.speakerOn) {
      this.setState({speakerOn: false});
      RTCSetting.setAudioOutput('handset');
    } else {
      this.setState({speakerOn: true});
      RTCSetting.setAudioOutput('speaker');
    }
  }  /* Button event end */
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: RED,
  },
  topContainer: {
    flex: 0.57,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagTextContainer: {
    flex: 0.15,
    justifyContent: 'flex-end',
  },
  flagText: {
    fontSize: 24,
    color: 'white',
  },
  deltaTextContainer: {
    flex: 0.6,
    justifyContent: 'flex-start',
  },
  deltaText: {
    fontSize: 34,
    color: 'white',
  },
  middleContainer: {
    flex: 0.13,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  divideContainer: {
    flex: 0.05,
  },
  divideContainerx2: {
    flex: 0.1,
  },
  bottomContainer: {
    flex: 0.25,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  circleButton: {
    height: 90,
    width: 90,
    borderRadius: 45,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioControlButtonOff: {
    height: 60,
    width: 60,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 30,
    marginLeft: 30,
  },
  audioControlButtonOn: {
    height: 60,
    width: 60,
    borderRadius: 45,
    backgroundColor: 'white',
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 30,
    marginLeft: 30,
  },
});

AppRegistry.registerComponent('Pear', () => Pear);
