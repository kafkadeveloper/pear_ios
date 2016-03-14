'use strict';

import React, {
  Component,
  StyleSheet,
  View,
  ScrollView,
  Text,
  Image,
} from 'react-native';

class AboutView extends Component {
  render() {
    return (
      <ScrollView style={{flex: 1, backgroundColor: this.props.bg}}
                  contentContainerStyle={{flex:1}}>
        <View style={{flex: 0.5, justifyContent: 'center', alignItems:'center'}}>
          <Text style={{color:'white', fontSize: 24}}>About Pear</Text>  
        </View>
        <View style={{flex: 0.5, justifyContent: 'center', alignItems:'center'}}>
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({

});

export default AboutView;

