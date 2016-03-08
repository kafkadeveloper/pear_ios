'use strict';

import React, {
  Component,
  StyleSheet,
  View,
  Text,
  Image,
  TouchableHighlight,
} from 'react-native';
import Animatable from 'react-native-animatable';
import Swiper from 'react-native-swiper';
import AboutView from './AboutView';

const RED = '#ff6169';
const BLUE = '#26476b';
const GREY = '#e0e0e0';

class MainView extends Component {

  contructor(props) {
    super(props);
  }

  render() {
    if (this.props.calling) {
      return renderHangupView();
    } else {
      return renderCallView();
    }
  }

  renderCallView() {
    return (
      <Swiper style={styles.wrapper}  loop={false} index={1} showsPagination={false}>
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
                                  onPress={this.state.buttonAble ? this.onCallButtonPressed.bind(this) : null}>
                <Image source={require('image!call')} style={{width: 30, height: 30,}} />
              </TouchableHighlight>
            </Animatable.View>
          </View>
        </View>
      </Swiper>
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
    if (this.props.micMuted) {
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
    if (this.props.speakerOn) {
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

