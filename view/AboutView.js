'use strict';

import React, {
  Component,
  StyleSheet,
  View,
  Text,
  Image,
} from 'react-native';

class AboutView extends Component {
  render() {
    return (
      <View style={{flex: 1, flexDirection: 'column', backgroundColor: this.props.bg}}>
        <View style={styles.topContainer}> 
        </View>
        <View style={styles.bottomContainer}>
          <Image source={require('image!logo')} style={{width: 60, height: 60,}} />
          <Text style={styles.versionText}>v0.0.1</Text> 
          <Text style={styles.websiteText}>pearvoice.com</Text> 
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({ 
  topContainer: {
    flex: 0.80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomContainer: {
    flex: 0.20,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  versionText: {
    color: 'white',
    fontSize: 12,
  },
  websiteText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  }
});

export default AboutView;

