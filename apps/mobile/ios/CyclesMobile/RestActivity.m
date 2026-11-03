#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (RestActivity, NSObject)

RCT_EXTERN_METHOD(show : (double)startedAtMs endsAtMs : (double)endsAtMs resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(hide : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)

@end
