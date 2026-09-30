// Classic worker: MediaPipe's WASM loader uses importScripts in workers.
let detector;
self.onmessage=async({data})=>{
  if(data.type==='start') {
    try {
      importScripts('/vision/vision_bundle.js');
      const files=await Vision.FilesetResolver.forVisionTasks('/vision/wasm');
      detector=await Vision.ObjectDetector.createFromOptions(files,{baseOptions:{modelAssetPath:'/vision/person.tflite',delegate:'CPU'},runningMode:'IMAGE',categoryAllowlist:['person'],scoreThreshold:.55,maxResults:2});
      postMessage({type:'ready'});
    }catch{postMessage({type:'error',message:'Local camera vision could not start on this browser.'});}
  }
  if(data.type==='frame') {
    try {const results=detector.detect(data.bitmap);const person=results.detections[0];postMessage({type:'result',visible:!!person,score:person?.categories?.[0]?.score||0});}
    catch{postMessage({type:'error',message:'Local camera vision paused. Room play is still available.'});}
    finally{data.bitmap.close();}
  }
};
