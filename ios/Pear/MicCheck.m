//
//  MicCheck.m
//  Pear
//
//  Created by Justin Ko on 3/12/16.
//  Copyright © 2016 Justin Ko. All rights reserved.
//

#import "MicCheck.h"
@import AVFoundation;

@implementation MicCheck

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(micCheck:(RCTResponseSenderBlock) callback) {
  __block NSNumber *val = [NSNumber numberWithInt:-1];
  [[AVAudioSession sharedInstance] requestRecordPermission:^(BOOL granted) {
    if (granted) {
      val = [NSNumber numberWithInt:1];
    } else {
      val = [NSNumber numberWithInt:0];
    }
  }];
  callback(@[[NSNull null], val]);
}
@end
