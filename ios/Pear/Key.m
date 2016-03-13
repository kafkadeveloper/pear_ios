//
//  Key.m
//  Pear
//
//  Created by Justin Ko on 3/12/16.
//  Copyright © 2016 Justin Ko. All rights reserved.
//

#import "Key.h"

@implementation Key

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(getKey: (RCTResponseSenderBlock) callback) {
  NSMutableString *j = [NSMutableString stringWithCapacity:32];
  NSString *k = @"lCm-!jyfufR5eZID*bpnkPsWpo4wGUq-N&JD5biBlFoeA$Gf%QcE8tn6AoBPTIuRDe3UhottCjU!Vu4oWw07%G!x8HYn40BN00dw#J10ab1Zw3BW%09BH9n4%bHC36UbP-dVM&1E8a!Pek2WRmHdjv22AK4hZJ46CxTiN3ktYtvVwo%*$RzRa$L0NlM+XM%SNuBTpktxPI1ht3Lf*KHBu9eiXHKMbg&H%j8ZN69yhmQut-&j+-W6Pp#2*vZvFfuy6orc2wgAJI7IXqRuuMnhxypHl-$yJV#ChQGZRBS6a-#Cs2u1lEz0uz3ms9EKLKg-FNLGsB+9yz%O$pCa%XixUmf95aSU6MQHj!gr5zwb77KiiMS293HpB2chabY7cSJuh$dolRCNJhmbVU-oP#lZ19Ud1n3n!%Iq$yw*i%dOKQj013gQ6*R-yue9Xk$jsL5dlZpT!lWiq1Nr$2GF%itBQFB1N2exn3leU4h$15#roYq%58HuwVf!tKSw5SCfU*+#P6EaY#zorZX&mWwS77gEF!SDW60c&w6-v2Cr9RZnvNrD4C2tOmO7WGtbLa+MfchQ9&+&+wygRLS7+Hb$fVFOmhsfA993#fHlR6KyZTtJ*oin8JzrgF7%mNN7iCXomavh3$Z1Maw6LT&v8Qh26oTkIKL$b63FoRG$Stdq9!QArGieK83qmhfpcuKEZEzs5G4D8S6dZq6yfcmPMhOWq";
  unsigned long long l = M_PI * pow(10, 18);
  NSString *m = [NSString stringWithFormat:@"%llu", l];
  for (int i = 0; i < 19; i++) {
    int  n = [m characterAtIndex:i];
    int  o = pow(i, 2);
    int  p = n+o;
    char e = [k characterAtIndex:p];
    [j appendString:[NSString stringWithFormat:@"%c", e]];
  }
  
  callback(@[[NSNull null], [[[j dataUsingEncoding:NSUTF8StringEncoding] base64EncodedStringWithOptions:0] stringByReplacingOccurrencesOfString:@"=" withString:@""]]);
}

//+(NSString *)getKey {
//  NSMutableString *j = [NSMutableString stringWithCapacity:32];
//  NSString *k = @"lCm-!jyfufR5eZID*bpnkPsWpo4wGUq-N&JD5biBlFoeA$Gf%QcE8tn6AoBPTIuRDe3UhottCjU!Vu4oWw07%G!x8HYn40BN00dw#J10ab1Zw3BW%09BH9n4%bHC36UbP-dVM&1E8a!Pek2WRmHdjv22AK4hZJ46CxTiN3ktYtvVwo%*$RzRa$L0NlM+XM%SNuBTpktxPI1ht3Lf*KHBu9eiXHKMbg&H%j8ZN69yhmQut-&j+-W6Pp#2*vZvFfuy6orc2wgAJI7IXqRuuMnhxypHl-$yJV#ChQGZRBS6a-#Cs2u1lEz0uz3ms9EKLKg-FNLGsB+9yz%O$pCa%XixUmf95aSU6MQHj!gr5zwb77KiiMS293HpB2chabY7cSJuh$dolRCNJhmbVU-oP#lZ19Ud1n3n!%Iq$yw*i%dOKQj013gQ6*R-yue9Xk$jsL5dlZpT!lWiq1Nr$2GF%itBQFB1N2exn3leU4h$15#roYq%58HuwVf!tKSw5SCfU*+#P6EaY#zorZX&mWwS77gEF!SDW60c&w6-v2Cr9RZnvNrD4C2tOmO7WGtbLa+MfchQ9&+&+wygRLS7+Hb$fVFOmhsfA993#fHlR6KyZTtJ*oin8JzrgF7%mNN7iCXomavh3$Z1Maw6LT&v8Qh26oTkIKL$b63FoRG$Stdq9!QArGieK83qmhfpcuKEZEzs5G4D8S6dZq6yfcmPMhOWq";
//  unsigned long long l = M_PI * pow(10, 18);
//  NSString *m = [NSString stringWithFormat:@"%llu", l];
//  for (int i = 0; i < 19; i++) {
//    int  n = [m characterAtIndex:i];
//    int  o = pow(i, 2);
//    int  p = n+o;
//    char e = [k characterAtIndex:p];
//    [j appendString:[NSString stringWithFormat:@"%c", e]];
//  }
//  return [[[j dataUsingEncoding:NSUTF8StringEncoding] base64EncodedStringWithOptions:0] stringByReplacingOccurrencesOfString:@"=" withString:@""];
//}
@end
