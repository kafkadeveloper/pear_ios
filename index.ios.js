'use strict';

/* Permanent storage keys */
const REV = '21'
const STORAGE_FRESH = '@PearStorage:fresh' + REV;
const STORAGE_MIC = '@PearStorage:mic' + REV;
const STORAGE_LOC = '@PearStorage:loc' + REV;
const STORAGE_UPT = '@PearStorage:upt' + REV;


/* Color palette */
const RED = '#ff6169';
const BLUE = '#26476b';
const GREY = '#f6f6f6';

var DeviceInfo = require('react-native-device-info');

var React = require('react-native');
var {
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
  Dimensions,
} = React;

window.navigator.userAgent = "react-native";

var io = require('socket.io-client/socket.io');
var WebRTC = require('react-native-webrtc');
var {
  RTCPeerConnection,
  RTCMediaStream,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  RTCSetting,
} = WebRTC;
var configuration = {"iceServers": [{"url": "stun:stun.l.google.com:19302"},
                                    {"url": "stun:stun.services.mozilla.com"}]};

var localStream;
var socket;
var pcPeers = {};
var component;

function getLocalStream(callback) {
  var constraints = {video: false, audio: true};
  navigator.getUserMedia(constraints, stream => {
    console.log('getUserMediaSuccess');
     /* getUserMediaSuccess */ localStream = stream;
                               callback();
  }, /* get UserMediaFail  */  logError);
}

function join(roomId) {
  console.log('joinRoom');
  socket.emit('join', roomId, socketIds => {
    for (var i in socketIds) {
      createPC(socketIds[i], true);
    }
  });
}

function createPC(socketId, isOffer) {
  var pc = new RTCPeerConnection(configuration);
  pcPeers[socketId] = pc;

  function createOffer() {
    pc.createOffer(desc => {
      // console.log('createOffer', desc);
      console.log('createOffer');
      pc.setLocalDescription(desc, () => {
        // console.log('setLocalDescription', pc.localDescription);
        console.log('setLocalDescription');
        socket.emit('exchange', {'to': socketId, 'sdp': pc.localDescription});
      }, logError);
    }, logError);
  }

  pc.onicecandidate = event => {
    // console.log('onicecandidate', event.candidate);
    console.log('onicecandidate');
    if (event.candidate) {
      socket.emit('exchange', {'to': socketId, 'candidate': event.candidate});
    }
  };
  pc.onnegotiationneeded = () => {
    console.log('onnegotiationneeded');
    if (isOffer) {
      createOffer();
    }
  };
  pc.oniceconnectionstatechange = event => {
    console.log('oniceconnectionstatechange', event.target.iceConnectionState);
  };
  pc.onsignalingstatechange = event => {
    console.log('onsignalingstatechange', event.target.signalingState);
  };
  pc.onaddstream = event => {
    // console.log('onaddstream', event.stream);
    console.log('onaddstream');
    /*component.setState({remoteSrc: event.stream.toURL()});*/
  };
  pc.onremovestream = event => {
    console.log('onremovestream', event);
  };

  pc.addStream(localStream);
  return pc;
}

function exchange(data) {
  var fromId = data.from;
  var pc;
  if (fromId in pcPeers) {
    pc = pcPeers[fromId];
  } else {
    pc = createPC(fromId, false);
  }

  if (data.sdp) {
    // console.log('exchange sdp', data);
    console.log('exchange sdp');
    pc.setRemoteDescription(new RTCSessionDescription(data.sdp), () => {
      if (pc.remoteDescription.type == "offer") {
        pc.createAnswer(desc => {
          // console.log('createAnswer', desc);
          console.log('createAnswer');
          pc.setLocalDescription(desc, () => {
            // console.log('setLocalDescription', pc.localDescription);
            console.log('setLocalDescription');
            socket.emit('exchange', {'to': fromId, 'sdp': pc.localDescription});
          }, logError);
        }, logError);
      }
    }, logError);
  } else {
    // console.log('exchange candidate', data);
    console.log('exchange candidate');
    pc.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
}

function end() {
  /* UI change */
  clearInterval(component.state.callInterval);
  component.setState({calling: false, 
                      callDeltaTime: '00:00', 
                      /*remoteSrc:null,*/
                      micMuted: false,
                      speakerOn: false, 
                      bgColor: RED});
  // unmute

  /* Disconnect from server */
  console.log('end');
  socket.disconnect();

  /* Close peer connection and delete them */
  for (var socketId in pcPeers) {
    pcPeers[socketId].close();
    delete pcPeers[socketId];
  }

  /* Hangup setting */
  RTCSetting.setProximityScreenOff(false);
}

function logError(error) {
  console.log('logError', error);
}

function listen() {
  // is this the right way to do this?
  socket.on('connect_error', data => {
    console.log('connect error', data);
    end();
  });

  socket.on('connect', data => {
    console.log('connect');

    /* Call settings */
    RTCSetting.setAudioOutput('handset');
    RTCSetting.setKeepScreenOn(false);
    RTCSetting.setProximityScreenOff(true);

    /* getLocalStream and join */
    getLocalStream(() => {
      var id = makeRoomId();
      var roomName = component.state.hashTagText.replace(/#/g, '');

      join({name: roomName, 
            id: roomName + '@' + id, 
            device: component.state.deviceInfo,
            loc: component.state.loc});
    });
  });

  socket.on('exchange', data => {
    console.log('exchange');
    exchange(data);
  });

  socket.on('end', () => {
    end();
  });

  console.log('listening');
}

function getDeviceInfo() {
  return  DeviceInfo.getUniqueID() + '@' +
          DeviceInfo.getModel().split(' ').join('_') + '@' +
          DeviceInfo.getSystemVersion() + '@' +
          DeviceInfo.getReadableVersion() + '@' +
          DeviceInfo.getDeviceLocale();
}

function getLoc(callback) {
  var url = 'http://ipinfo.io/country';
  fetch(url).then(res => {
    return res.text();
  }).then(body => {
    if (body.trim().length > 5) {
      callback();
    } else {
      callback(body.trim());
    }
  });
}

function makeRoomId() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < 10; i++) {
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

      bgColor: RED,

      visibleHeight: Dimensions.get('window').height,

      calling: false,
      hashTagText: '#',
      /*remoteSrc: null,*/

      micMuted: false,
      speakerOn: false,

      callStartTime: null,
      callDeltaTime: '00:00',
      callInterval: null,
    }
  }

  componentDidMount() {
    component = this;
    this.state.deviceInfo = getDeviceInfo();
    this._checkFreshAndMicState().done;
    this._checkAndUpdateUptAndLocState().done;
    DeviceEventEmitter.addListener('keyboardWillShow', this.keyboardWillShow.bind(this));
    DeviceEventEmitter.addListener('keyboardWillHide', this.keyboardWillHide.bind(this));
  }

  /* Async storage methods */
  async _checkFreshAndMicState() {
    console.log('_checkFreshAndMicState');
    try {
      var freshValue = await AsyncStorage.getItem(STORAGE_FRESH);
      var micValue = await AsyncStorage.getItem(STORAGE_MIC);
      /* First-ever loading */
      if (!freshValue) {
        this.setState({fresh: true, micPermission: 'NO'});
        await AsyncStorage.setItem(STORAGE_FRESH, new Date());
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
      var uptValue = await AsyncStorage.getItem(STORAGE_UPT);
      if ((new Date() - new Date(uptValue)) > 3600000) {
        console.log('update loc state');
        await getLoc(currLoc => {
          if (currLoc) {
            var currTime = new Date();
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
          var locValue = await AsyncStorage.getItem(STORAGE_LOC);
          this.setState({loc: locValue});
        } else {
          console.log('loc state already available');
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

  /* Keyboard event responder */
  keyboardWillShow(e) {
    if (this.state.visibleHeight === 667) {           // iPhone 6, 6s
      this.setState({visibleHeight: 667 - 20});
    } else if (this.state.visibleHeight === 568) {    // iPhone 5, 5s
      this.setState({visibleHeight: 568 - 70});
    } else if (this.state.visibleHeight === 480) {    // iPhone 4, 4s
      this.setState({visibleHeight: 480 - 120}); 
    } /* else: 736: iPhone 6 plus, 6s plus */
  }

  keyboardWillHide(e) {
    this.setState({visibleHeight: Dimensions.get('window').height});
  }  /* Keyboard event responders */

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
          <TouchableHighlight style={{width: 200, height: 40,alignItems:'center',justifyContent:'center', borderWidth:1, borderColor:'white', borderRadius:13, backgroundColor: 'transparent'}}
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

  renderCallView() {
    return (
      <ScrollView style={{backgroundColor: this.state.bgColor}} 
                  contentContainerStyle={styles.container, {height: this.state.visibleHeight}}
                  scrollEnabled={false}>
        <View style={styles.callTopContainer}>
        </View>
        <View style={styles.callMiddleContainer}>
          <TextInput style={styles.hashTagInput}
                     value={this.state.hashTagText}
                     onChange={this.onHashTagTextChanged.bind(this)}
                     onFocus={this.onHashTagTextFocused.bind(this)}
                     onEndEditing={this.onHashTagTextEndEditing.bind(this)}
                     autoCapitalize='none'
                     autoCorrect={false}
                     maxLength={21}
                     keyboardType='ascii-capable' />
        </View>
        <View style={styles.divideContainer}>
        </View>
        <View style={styles.callButtonContainer}>
          <TouchableHighlight style={styles.circleButton}
                              underlayColor={GREY}
                              onPress={this.onCallButtonPressed.bind(this)}>
            <Text style={styles.circleButtonText, {color: this.state.bgColor}}>Call</Text>
          </TouchableHighlight>
        </View>
      </ScrollView>
    );
  }

  renderHangupView() {
    return (
      <ScrollView style={{backgroundColor: this.state.bgColor}} 
                  contentContainerStyle={styles.container, {height: this.state.visibleHeight}}
                  scrollEnabled={false}>
        <View style={styles.hangupTopContainer}>
          <View style={styles.callingTextContainer}>
            <Text style={styles.callingText}>Calling {this.state.hashTagText}</Text>
          </View>
          <View style={styles.deltaTextContainer}>
            <Text style={styles.deltaText}>{this.state.callDeltaTime}</Text>
          </View>
        </View>
        <View style={styles.hangupMiddleContainer}>
          {this.renderMuteButton()}
          {this.renderSpeakerButton()}
        </View>
        <View style={styles.divideContainer}>
        </View>
        <View style={styles.hangupButtonContainer}>
          <TouchableHighlight style={styles.circleButton}
                              underlayColor={GREY}
                              onPress={this.onHangupButtonPressed.bind(this)}>
            <Text style={styles.circleButtonText, {color: this.state.bgColor}}>Hang up</Text>
          </TouchableHighlight>
        </View>
      </ScrollView>
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

  linearGradualBackgroundShiftStart(x, y, callback) {
    var z = this.state.bgColor;
    var zStr = '';
    var zHex = [];
    var xHex = [];
    var yHex = [];
    var diffHex= [];
    var iMax = 0;

    for (var i = 1; i <= 5; i += 2) {
      zHex.push(parseInt(z.slice(i, i+2), 16));
      xHex.push(parseInt(x.slice(i, i+2), 16));
      yHex.push(parseInt(y.slice(i, i+2), 16));
      diffHex.push(parseInt(x.slice(i, i+2), 16) - parseInt(y.slice(i, i+2), 16));
    }

    for (var i = 1; i < 3; i++) {
      if (diffHex[i] > diffHex[i-1]) {
        iMax = i;
      }
    }

    var gradientInterval = setInterval(() => {
      zStr = '#';
      if (diffHex[iMax] === 0) {
        /* End interval */
        clearInterval(gradientInterval);
        callback();
      } else {
        for (var i = 0; i < 3; i++) {
          if (diffHex[i] > 0) {
            if (diffHex[i] < 6) {
              diffHex[i]--;
              zHex[i]--;
            } else {
              diffHex[i] -= 6;
              zHex[i] -= 6;
            }
          } else if (diffHex[i] < 0) {
            if (diffHex[i] < 6) {
              diffHex[i]++;
              zHex[i]++;
            } else {
              diffHex[i] += 6;
              zHex[i] += 6;
            }
          }
          zStr += zHex[i].toString(16);
        }
        this.setState({bgColor: zStr});
      }
    }, 4);
  }

  onCallButtonPressed() {
    /* Connect to server and peer */
    socket = io('https://stark-plains-31370.herokuapp.com/api/webrtc', { query: 'secret=abcde', forceNew: true });
    listen();
    /* UI change */
    this.linearGradualBackgroundShiftStart(RED, BLUE, () => {
      this.setState({
      callStartTime: new Date(),
      callInterval: setInterval(() => { 
        var mss = Math.floor((new Date() - this.state.callStartTime) / 1000);
        var secs = mss % 60;
        var minutes = Math.floor(mss / 60);
        secs > 9 ? secs = secs.toString() : secs = '0' + secs.toString();
        minutes > 9 ? minutes = minutes.toString() : minutes = '0' + minutes.toString();
        this.setState({callDeltaTime: minutes + ':' + secs});
      }, 1000),
      calling: true,
      bgColor: BLUE,
    });
    });
  }

  onHangupButtonPressed() {
    end();
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

  /* Text input callbacks start */
  onHashTagTextFocused() {
    this.setState({hashTagText: '#'});
  }

  onHashTagTextChanged(event) {
    if (!event.nativeEvent.text) {
      this.setState({hashTagText: '#'});
    } else if (event.nativeEvent.text[0] !== '#') {
      this.setState({hashTagText: '#'});
    } else {
      this.setState({hashTagText: event.nativeEvent.text});
    }
  }

  onHashTagTextEndEditing() {
    this.setState({hashTagText: this.state.hashTagText.toLowerCase().replace(/@| /g, '')});
  }  /* Text input callbacks end */
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  callTopContainer: {
    flex: 0.60,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hangupTopContainer: {
    flex: 0.57,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callingTextContainer: {
    flex: 0.4,
    justifyContent: 'center',
  },
  callingText: {
    fontSize: 18,
    color: 'white',
  },
  deltaTextContainer: {
    flex: 0.7,
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
  },
  deltaText: {
    fontSize: 38, // 32
    color: 'white',
  },
  callMiddleContainer: {
    flex: 0.1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    flexDirection: 'column',
  },
  hangupMiddleContainer: {
    flex: 0.13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    flexDirection: 'row',
  },
  hashTagInput: {
    height: 40,
    width: Dimensions.get('window').width-20,
    paddingLeft: 15,
    paddingRight: 15,
    backgroundColor: 'transparent',
    color: 'white',
    fontSize: 20,
    alignSelf: 'center',
    textAlign: 'center',
  },
  divideContainer: {
    flex: 0.05,
    backgroundColor: 'transparent',
  },
  callButtonContainer: {
    flex: 0.25,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
  },
  hangupButtonContainer: {
    flex: 0.25,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
  },
  circleButton: {
    height: 90,
    width: 90,
    borderRadius: 45,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonText: {
    fontSize: 18,
  },
  audioControlButtonOff: {
    height: 60,
    width: 60,
    borderRadius: 45,
    backgroundColor: 'transparent',
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
