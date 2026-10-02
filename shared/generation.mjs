export const OPEN_GENERATIONS = new Set(['restoring','running','submitting','awaiting_approval','processing','finish_pending','finish_failed','uncertain']);
export function generationCopy(job) {
  const name=job.name||'Your companion';
  if(job.status==='restoring')return {title:'Restoring your generation…',note:'Checking the saved request. No new generation is being submitted.',action:'Check progress',busy:true};
  if(job.status==='awaiting_approval')return {title:`${name}’s artwork is ready`,note:'Waiting for your approval. Review the artwork below; the 3D build has not started.',action:'Review artwork',busy:false};
  if(job.status==='complete')return {title:`${name} is ready to meet`,note:job.quality?.faceReviewRequired?'Ready · 13 living animations. The jaw fit is estimated: check Sleepy and Hello before sharing.':'Ready · detailed companion with 13 living animations.',action:'Meet your pet',busy:false};
  if(job.status==='finish_failed')return {title:'Animation finishing needs attention',note:`${job.error||'The local finishing step could not complete.'} Retry this step without spending more credits.`,action:'Review finishing',busy:false};
  if(job.status==='uncertain')return {title:'Request confirmation needs checking',note:`${job.error||'The provider did not confirm the submission.'} Check the request in Tripo before retrying; another paid request has not been submitted.`,action:'Check status',busy:false};
  if(job.status==='failed')return {title:`${name}’s generation stopped`,note:job.error||'This stage failed. No automatic paid retry was submitted.',action:'View details',busy:false};
  const titles={reference:`Creating ${name}’s artwork…`,mesh:`Building ${name}’s 3D model…`,check:'Checking the four-legged model…',rig:'Preparing the movement skeleton…',walk:'Adding four-paw movement…',finish:'Finishing expressions and stepping turns…'};
  return {title:titles[job.stage]||'Creating your companion…',note:job.stage==='finish'?'Blender is adding the living animations locally. You can keep playing while it finishes.':job.stage==='reference'?'Generating the character reference. It will appear below for your approval before the 3D build.':'Your approved pet is being built. You can keep playing while we check progress.',action:'View progress',busy:true};
}
