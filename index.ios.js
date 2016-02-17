'use strict';

var DeviceInfo = require('react-native-device-info');

var React = require('react-native');
var {
  AppRegistry,
  Component,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableHighlight,
  ScrollView,
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
    /* getUserMediaSuccess */
    callback(stream);
  }, /* get UserMediaFail */  logError);
}

function join(roomId) {
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
      console.log('createOffer', desc);
      pc.setLocalDescription(desc, () => {
        console.log('setLocalDescription', pc.localDescription);
        socket.emit('exchange', {'to': socketId, 'sdp': pc.localDescription});
      }, logError);
    }, logError);
  }

  pc.onicecandidate = event => {
    console.log('onicecandidate', event.candidate);
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
    console.log('onaddstream', event.stream);
    peerConnected();
    // set remote audio source
    component.setState({remoteSrc: event.stream.toURL()});
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
    console.log('exchange sdp', data);
    pc.setRemoteDescription(new RTCSessionDescription(data.sdp), () => {
      if (pc.remoteDescription.type == "offer") {
        pc.createAnswer(desc => {
          console.log('createAnswer', desc);
          pc.setLocalDescription(desc, () => {
            console.log('setLocalDescription', pc.localDescription);
            socket.emit('exchange', {'to': fromId, 'sdp': pc.localDescription});
          }, logError);
        }, logError);
      }
    }, logError);
  } else {
    console.log('exchange candidate', data);
    pc.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
}

function end() {
  // Disconnect from server
  console.log('end');
  socket.disconnect();

  // close peer connection and delete them
  for (var socketId in pcPeers) {
    pcPeers[socketId].close();
    delete pcPeers[socketId];
  }

  // UI change
  component.setState({calling: false});
}

function peerConnected() {
  RTCSetting.setAudioOutput('handset');
  RTCSetting.setKeepScreenOn(false);
  RTCSetting.setProximityScreenOff(false);
}

function logError(error) {
  console.log('logError', error);
}

function listen(roomNameVal) {
  // is this the right way to do this?
  // TODO if someone gets error after joining, kick other out
  socket.on('connect_error', data => {
    console.log('connect error', data);
    end();
  });

  socket.on('connect', data => {
    console.log('connect');
    getLocalStream(() => {
      var id = makeRoomId();
      join({name: roomNameVal, 
            id: roomNameVal + '@' + id, 
            device: component.state.deviceInfo});
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
          DeviceInfo.getModel() + '@' +
          DeviceInfo.getSystemVersion() + '@' +
          DeviceInfo.getReadableVersion() + '@' +
          DeviceInfo.getDeviceLocale();
}

function getLoc(callback) {
  // run this 1 hour and update country code. 720 connections
  // TODO error handling
  var url = 'http://ipinfo.io/country';
  fetch(url).then(res => {
    return res.text();
  }).then(body => {
    callback(body.trim());
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
      visibleHeight: Dimensions.get('window').height,
      calling: false,
      remoteSrc: null,
      hashTagText: '#',
    }
  }

  componentDidMount() {
    component = this;
    this.state.deviceInfo = getDeviceInfo();
    DeviceEventEmitter.addListener('keyboardWillShow', this.keyboardWillShow.bind(this));
    DeviceEventEmitter.addListener('keyboardWillHide', this.keyboardWillHide.bind(this));
  }

  keyboardWillShow(e) {
    if (this.state.visibleHeight === 736) {           // iPhone 6 plus, 6s plus

    } else if (this.state.visibleHeight === 667) {    // iPhone 6, 6s
      this.setState({visibleHeight: 667 - 20});
    } else if (this.state.visibleHeight === 568) {    // iPhone 5, 5s
      this.setState({visibleHeight: 568 - 70});
    } else {                                          // iPhone 4, 4s
      this.setState({visibleHeight: 480 - 120}); 
    }
  }

  keyboardWillHide(e) {
    this.setState({visibleHeight: Dimensions.get('window').height});
  }

  render() {
    var callOrHangup = this.state.calling ? 'Hang up' : 'Call';

    return (
      // if loading takes too long, add a loading screen
      <ScrollView contentContainerStyle={styles.container, {height: this.state.visibleHeight}}
                  scrollEnabled={false}>
        <View style={styles.topContainer}>
        </View>
        <View style={styles.hashTagContainer}>
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
          <TouchableHighlight style={styles.callButton}
                              underlayColor="#e0e0e0"
                              onPress={this.onCallButtonPressed.bind(this)}>
            <Text style={styles.callButtonText}>{callOrHangup}</Text>
          </TouchableHighlight>
          <RTCView streamURL={this.state.remoteSrc}>
          </RTCView>
        </View>
      </ScrollView>
    );
  }

  onCallButtonPressed() {
    if (this.state.calling) {
      end();

      // UI change
      this.setState({calling: false});
    } else {
      var roomNameVal = this.state.hashTagText.toLowerCase().replace(/@|#| /g, '').slice(0, 21);

      socket = io('https://0.0.0.0:8000/api/webrtc', { query: 'secret=abcde', forceNew: true });
      listen(roomNameVal);

      // UI change
      this.setState({calling: true});
    }
  }

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
  }
  /* Text input callbacks end */
}

/* Color notes
Original Red : fe5351
Original Blue: 113951
New Red : ff6169
New Blue: 26476b
*/

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  topContainer: {
    flex: 0.60,
    backgroundColor: '#ff6169',
  },
  hashTagContainer: {
    flex: 0.1,
    justifyContent: 'center',
    backgroundColor: '#ff6169',
  },
  hashTagInput: {
    width: 260,
    height: 40,
    paddingLeft: 15,
    paddingRight: 15,
    backgroundColor: '#ff6169',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'white',
    color: 'white',
    fontSize: 20,
    alignSelf: 'center',
    textAlign: 'center',
  },
  divideContainer: {
    flex: 0.05,
    backgroundColor: '#ff6169',
  },
  callButtonContainer: {
    flex: 0.25,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#ff6169',
  },
  callButton: {
    height: 90,
    width: 90,
    backgroundColor: 'white',
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonText: {
    fontSize: 18,
    color: '#ff6169',
  },
});

AppRegistry.registerComponent('Pear', () => Pear);
