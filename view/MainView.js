'use strict';

import React, {
  Component,
  StyleSheet,
  View,
  Text,
  Image,
  TouchableHighlight,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Animatable from 'react-native-animatable';
import Swiper from 'react-native-swiper';
import AboutView from './AboutView';

let {AudioPlayer} = require('react-native-audio');
let analytics = require('../js/analytics');
let emojiloading = require('../js/emojiloading');

const TRACKING_ID = 'UA-75025059-2';
const CALLTONE = 'call-tone.mp3';
const RED = '#ff6169';
const BLUE = '#26476b';
const GREY = '#e0e0e0';
const RED_RGBA = 'rgba(255, 97, 105, x)';
const BLUE_RGBA = 'rgba(38, 71, 107, x)';

class MainView extends Component {

  constructor(props) {
    super(props);
    this.state = {
      calling: false,
      callButtonAble: true,
      hangupButtonAble: false,

      bgOverlayColor: RED,

      emojiInterval: null,
      emojiCounter: 0,

      callInterval: null,
      callStartTime: null,
      deltaStr: '',
      deltaInt: 0,
    };
  }

  render() {
    if (this.props.fresh)
      return this._renderWelcomeView();

    /* Permission screen */
    // if (this.state.micPermission !== 'YES') {  // TODO make a modal view for this and show at call
    //   return this.renderPermissionView();
    // }

    if (this.state.calling)
      return this._renderHangupView();
    else
      return this._renderCallView();
  }

  /* Render functions */
  _renderCallView() {
    return (
      <Swiper style={styles.wrapper} loop={false} index={1} showsPagination={false}>
        <AboutView bg={RED}/>
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
                                  onPress={this.state.callButtonAble ? this._onMainViewCallButtonPressed.bind(this) : null}>
                <Image source={require('image!call')} style={{width: 30, height: 30,}} />
              </TouchableHighlight>
            </Animatable.View>
          </View>
        </View>
      </Swiper>
    );
  }

  _renderHangupView() {
    let peerLocOrConnecting = this.props.peerLoc ? this.props.peerLoc : 'connecting';
    return (
      <View style={styles.container}>
        <View style={{flex: 1, flexDirection: 'column', backgroundColor: this.state.bgOverlayColor}}>
          <View style={styles.topContainer}>
            <View style={styles.divideContainerx2}></View>
            <View style={styles.divideContainerx2}></View>
            <View style={styles.flagTextContainer}>
              <Animatable.Text style={styles.flagText} animation="bounceIn" ref="aniviewflag">
                {peerLocOrConnecting}
              </Animatable.Text>
            </View>
            <View style={styles.divideContainer}></View>
            <View style={styles.deltaTextContainer}>
              <Animatable.Text style={styles.deltaText} animation="bounceIn" ref="aniviewdelta">
                {this.state.deltaStr}
              </Animatable.Text>
            </View>
          </View>
          <Animatable.View style={styles.middleContainer} animation="bounceIn" ref="aniviewopt">
            {this._renderMuteButton()}
            {this._renderSpeakerButton()}
          </Animatable.View>
          <View style={styles.divideContainer}></View>
          <Animatable.View style={styles.bottomContainer} animation="bounceInUp" ref="aniviewhang">
            <TouchableHighlight style={styles.circleButton}
                                underlayColor={GREY}
                                onPress={this.state.hangupButtonAble ? this.onMainViewHangupButtonPressed.bind(this) : null}>
              <Image source={require('image!hangup')} style={{width: 36, height: 36,}} />
            </TouchableHighlight>
          </Animatable.View>
        </View>
      </View>
    );
  } 

  _renderMuteButton() {
    let buttonStyle = this.props.micMuted ? styles.audioControlButtonOn : styles.audioControlButtonOff;
    let buttonImage = this.props.micMuted ? require('image!muteOn') : require('image!muteOff');

    return (
      <TouchableHighlight style={buttonStyle}
                          underlayColor={GREY}
                          onPress={this.props.onMuteButtonPressed}>
        <Image source={buttonImage} style={{width: 17, height: 20,}} />
      </TouchableHighlight>
    );
  }

  _renderSpeakerButton() {
    let buttonStyle = this.props.speakerOn ? styles.audioControlButtonOn : styles.audioControlButtonOff;
    let buttonImage = this.props.speakerOn ? require('image!speakerOn') : require('image!speakerOff');
 
    return (
      <TouchableHighlight style={buttonStyle}
                          underlayColor={GREY}
                          onPress={this.props.onSpeakerButtonPressed}>
        <Image source={buttonImage} style={{width: 20, height: 20,}} />
      </TouchableHighlight>
    );
  }

  _renderWelcomeView() {
    return (
      <View style={styles.container}>
        <View style={{flex: 0.5, justifyContent: 'center', alignItems:'center'}}>
          <Text style={{alignSelf: 'center', color:'white', fontSize:30}}>Welcome screen</Text>
        </View>
        <View style={{flex: 0.5, justifyContent: 'center', alignItems:'center'}}>
          <TouchableHighlight style={{width: 200, height: 40, alignItems:'center',justifyContent:'center', borderWidth:1, borderColor:'white', borderRadius:13, backgroundColor: 'transparent'}}
                              underlayColor={GREY}
                              onPress={this.props.onWelcomeButtonPressed}>
            <Text style={{color: 'white', fontSize: 18}}>Let's get started 😀</Text>
          </TouchableHighlight>
        </View>
      </View>
    );
  }

  _renderPermissionView() {
    return (
      <View style={styles.container}>
        <Text>Permission</Text>
      </View>
    );
  }

  /* Button press event handlers */
  _onMainViewCallButtonPressed() {
    this.setState({callButtonAble: false, deltaStr: ''}, () => {
      this.refs.aniviewcall.zoomOutDown(600).then( endstate => {});
      this._linearGradualBackgroundShiftBlue(() => {
        /* Bring in Hangup elements after animations */
        this.setState({calling: true, hangupButtonAble: true});
        this._emojiIntervalStart();
        this._callAudioStart();
        this.props.onCallButtonPressed();
      });
    });
  }

  onMainViewHangupButtonPressed() {
    this.setState({hangupButtonAble: false}, () => {
      clearInterval(this.state.emojiInterval);
      clearInterval(this.state.callInterval);
      this.callAudioStop();

      this.refs.aniviewflag.zoomOut(600).then( endstate => {});
      this.refs.aniviewdelta.zoomOut(600).then( endstate => {});
      this.refs.aniviewopt.zoomOut(600).then( endstate => {});
      this.refs.aniviewhang.zoomOut(600).then( endstate => {});
      this._linearGradualBackgroundShiftRed(() => {
        /* Bring in Call elements after animations */
        this.setState({calling: false, callButtonAble: true});
        this.props.onHangupButtonPressed();
        this.sendAnalytics();
      });
    });
  }

  /* Animation functions */
  _linearGradualBackgroundShiftRed(callback) {
    let d = 0.9;
    let gradientInterval = setInterval(() => {
      if (d < 0) {
        clearInterval(gradientInterval);
        this.setState({bgOverlayColor: RED});
        callback();
      } else {
        this.setState({bgOverlayColor: BLUE_RGBA.replace('x', d)});
      }
      d -= 0.05;
    }, 30);
  }

  _linearGradualBackgroundShiftBlue(callback) {
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

  /* Interval functions */
  callTimeIntervalStart() {
    this.setState({callStartTime: new Date(), deltaStr: '00:00', deltaInt: 0}, () => {
      this.setState({
        callInterval: setInterval(() => { 
          let mss = Math.floor((new Date() - this.state.callStartTime) / 1000);
          let secs = mss % 60;
          let mins = Math.floor(mss / 60);
          secs > 9 ? secs = secs.toString() : secs = '0' + secs.toString();
          mins > 9 ? mins = mins.toString() : mins = '0' + mins.toString();
          this.setState({deltaStr: mins + ':' + secs, deltaInt: mss});
        }, 1000)
      });
    });
  }

  _emojiIntervalStart() {
    this.setState({callStartTime: new Date(), deltaInt: 0, emojiCounter: 0, deltaStr: ''}, () => {
      this.setState({
        emojiInterval: setInterval(() => {
          let mss = Math.floor((new Date() - this.state.callStartTime) / 1000);
          let counter = this.state.emojiCounter;
          let current = this.state.deltaStr;
          this.setState({emojiCounter: counter + 1, deltaStr: emojiloading(current, counter), deltaInt: -1 * mss});
        }, 450)
      });
    });
  }

  /* Audio functions */
  _callAudioStart() {
    AudioPlayer.play(CALLTONE);
  }

  callAudioStop() {
    AudioPlayer.stop();
  }

  /* Analytics functions */
  sendAnalytics() {
    analytics(TRACKING_ID, 
              DeviceInfo.getUniqueID(), 
              DeviceInfo.getDeviceLocale(), 
              DeviceInfo.getReadableVersion(), 
              this.state.deltaInt);
  }
}

const styles = StyleSheet.create({
  wrapper: {

  },
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
    fontFamily: 'CourierNewPS-BoldMT',
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

export default MainView;

