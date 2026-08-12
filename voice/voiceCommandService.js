(function(root){
'use strict';
const SCHEMA='plmr-voice-command-session-v1';
const LANGUAGES=Object.freeze(['tr-TR','en-US']);
const DEFAULT_TIMEOUT=15000;
function normalizeTranscript(value,lang='tr-TR'){
  let text=String(value||'').trim().replace(/\s+/g,' ');
  if(lang==='tr-TR') text=text.replace(/\bmilimetre\b/gi,'mm').replace(/\bsantimetre\b/gi,'cm').replace(/\bmetre\b/gi,'m');
  return text;
}
function createProvider(options={}){
  if(options.provider) return options.provider;
  const Ctor=options.SpeechRecognition||root.SpeechRecognition||root.webkitSpeechRecognition;
  if(!Ctor) return null;
  const instance=new Ctor();
  return {
    start(session){
      instance.lang=session.language;instance.continuous=false;instance.interimResults=false;
      instance.onresult=e=>session.onTranscript(e.results?.[0]?.[0]?.transcript||'');
      instance.onerror=e=>session.onError(Object.assign(new Error(`VOICE_RECOGNITION_${String(e.error||'ERROR').toUpperCase()}`),{code:e.error||'ERROR'}));
      instance.onend=()=>session.onEnd();instance.start();
    },
    stop(){if(instance.stop)instance.stop();},cancel(){if(instance.abort)instance.abort();}
  };
}
class VoiceCommandService{
  constructor(options={}){this.enabled=options.enabled===true;this.language=LANGUAGES.includes(options.language)?options.language:'tr-TR';this.timeoutMs=Math.max(1000,Number(options.timeoutMs)||DEFAULT_TIMEOUT);this.provider=createProvider(options);this.permission=options.permission||'prompt';this.active=null;}
  setEnabled(value){this.enabled=value===true;return this.enabled;}
  setLanguage(value){if(!LANGUAGES.includes(value))throw new Error('VOICE_LANGUAGE_UNSUPPORTED');this.language=value;return value;}
  setPermission(value){if(!['prompt','granted','denied'].includes(value))throw new Error('VOICE_PERMISSION_INVALID');this.permission=value;return value;}
  status(){return Object.freeze({schema:SCHEMA,enabled:this.enabled,language:this.language,permission:this.permission,active:Boolean(this.active),privacy:'LOCAL_TRANSCRIPT_ONLY'});}
  start(callbacks={}){
    if(!this.enabled)throw new Error('VOICE_DISABLED');if(this.permission==='denied')throw new Error('VOICE_PERMISSION_DENIED');if(!this.provider)throw new Error('VOICE_PROVIDER_UNAVAILABLE');if(this.active)throw new Error('VOICE_ALREADY_ACTIVE');
    let settled=false;const startedAt=Date.now();
    const finish=(kind,payload)=>{if(settled)return;settled=true;clearTimeout(timer);this.active=null;if(kind==='transcript'&&callbacks.onTranscript)callbacks.onTranscript(payload);if(kind==='error'&&callbacks.onError)callbacks.onError(payload);if(callbacks.onEnd)callbacks.onEnd(kind);};
    const session={schema:SCHEMA,language:this.language,startedAt,onTranscript:v=>finish('transcript',normalizeTranscript(v,this.language)),onError:e=>finish('error',e),onEnd:()=>finish('end')};
    const timer=setTimeout(()=>{try{this.provider.cancel?.();}finally{finish('error',Object.assign(new Error('VOICE_TIMEOUT'),{code:'VOICE_TIMEOUT'}));}},this.timeoutMs);
    this.active={session,timer,finish};this.provider.start(session);return Object.freeze({schema:SCHEMA,startedAt,language:this.language});
  }
  stop(){const active=this.active;if(!active)return false;this.provider.stop?.();active.finish('stopped');return true;}
  cancel(){const active=this.active;if(!active)return false;this.provider.cancel?.();active.finish('cancelled');return true;}
}
const api=Object.freeze({SCHEMA,LANGUAGES,DEFAULT_TIMEOUT,normalizeTranscript,createProvider,VoiceCommandService});root.PulumurVoiceCommandService=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
