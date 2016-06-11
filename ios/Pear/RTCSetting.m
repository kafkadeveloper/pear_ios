//
//  RTCSetting.m
//  Pear
//
//  Created by Justin Ko on 6/11/16.
//  Copyright © 2016 Justin Ko. All rights reserved.
//

#import "RTCSetting.h"
@import UIKit;
@import AVFoundation;

@implementation RTCSetting

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(setAudioOutput:(NSString *)output) {
  AVAudioSession *session = [AVAudioSession sharedInstance];
  if ([output isEqualToString:@"speaker"]) {
    [session overrideOutputAudioPort:AVAudioSessionPortOverrideSpeaker error:nil];
  } else if ([output isEqualToString:@"handset"]) {
    [session overrideOutputAudioPort:AVAudioSessionPortOverrideNone error:nil];
  }
}

RCT_EXPORT_METHOD(setKeepScreenOn:(BOOL)isOn) {
  [UIApplication sharedApplication].idleTimerDisabled = isOn;
}

RCT_EXPORT_METHOD(setProximityScreenOff:(BOOL)enabled) {
  [UIDevice currentDevice].proximityMonitoringEnabled = enabled;
}
@end
