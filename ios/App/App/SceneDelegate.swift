import UIKit
import Capacitor
import WebKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate, WKScriptMessageHandler {
    var window: UIWindow?
    private var marketingHandlerInstalled = false

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard scene is UIWindowScene else { return }
        // UISceneStoryboardFile already creates and assigns this window and its
        // Capacitor controller. Replacing it starts a second web view at launch.
        assert(window?.rootViewController is CAPBridgeViewController)


        #if DEBUG
        if let key = ProcessInfo.processInfo.environment["MARKETING_SCENE"], let controller = window?.rootViewController as? CAPBridgeViewController {
            let script = "(()=>{const scenes={\"01-3a\":{\"choice\":{\"id\":\"cielo\",\"name\":\"Sky\",\"size\":3,\"seed\":31,\"words\":[\"SUN\",\"LIGHT\",\"MOON\",\"CLOUD\"],\"number\":1,\"difficulty\":\"Fácil\",\"language\":\"en\"},\"data\":{\"version\":1,\"completed\":[],\"freeCompleted\":[],\"progress\":{\"cielo\":{\"paths\":{\"SUN\":[19,22,14]}}},\"customs\":[]},\"found\":[\"SUN\"],\"keys\":[\"ArrowRight\",\"ArrowRight\",\"ArrowUp\",\"-\"]},\"02-3b\":{\"choice\":{\"id\":\"cielo\",\"name\":\"Sky\",\"size\":3,\"seed\":31,\"words\":[\"SUN\",\"LIGHT\",\"MOON\",\"CLOUD\"],\"number\":1,\"difficulty\":\"Fácil\",\"language\":\"en\"},\"data\":{\"version\":1,\"completed\":[],\"freeCompleted\":[],\"progress\":{\"cielo\":{\"paths\":{\"SUN\":[19,22,14]}}},\"customs\":[]},\"found\":[\"SUN\"],\"keys\":[\"ArrowLeft\",\"ArrowLeft\",\"ArrowLeft\",\"ArrowLeft\",\"ArrowUp\",\"+\"]},\"03-4\":{\"choice\":{\"id\":\"naturaleza\",\"name\":\"Nature\",\"size\":4,\"seed\":1609,\"words\":[\"MOON\",\"CLOUD\",\"AIR\",\"SUN\",\"SEA\",\"RIVER\"],\"number\":5,\"difficulty\":\"Suave\",\"language\":\"en\"},\"data\":{\"version\":1,\"completed\":[\"cielo\",\"agua\",\"hogar\",\"desayuno\"],\"freeCompleted\":[],\"progress\":{\"naturaleza\":{\"paths\":{\"MOON\":[43,39,38,49],\"CLOUD\":[20,41,61,42,54]}}},\"customs\":[]},\"found\":[\"MOON\",\"CLOUD\"],\"keys\":[\"ArrowRight\",\"ArrowRight\",\"ArrowRight\",\"ArrowUp\",\"+\"]},\"04-6\":{\"choice\":{\"id\":\"universo\",\"name\":\"Universe\",\"size\":6,\"seed\":61,\"words\":[\"PLANET\",\"STAR\",\"GALAXY\",\"COMET\",\"ORBIT\",\"SATURN\",\"METEOR\",\"COSMOS\"],\"number\":13,\"difficulty\":\"Difícil\",\"language\":\"en\"},\"data\":{\"version\":1,\"completed\":[\"cielo\",\"agua\",\"hogar\",\"desayuno\",\"naturaleza\",\"huerto\",\"animales\",\"frutero\",\"bosque\",\"viaje\",\"musica\",\"escuela\"],\"freeCompleted\":[],\"progress\":{\"universo\":{\"paths\":{\"PLANET\":[154,149,148,112,155,118],\"STAR\":[213,172,171,135]}}},\"customs\":[]},\"found\":[\"PLANET\",\"STAR\"],\"keys\":[\"ArrowLeft\",\"ArrowLeft\",\"ArrowLeft\",\"ArrowLeft\",\"ArrowUp\"],\"tabletExtraKeys\":[\"+\",\"+\"]},\"05-home\":{\"data\":{\"version\":1,\"completed\":[],\"freeCompleted\":[],\"progress\":{},\"customs\":[]},\"found\":[],\"keys\":[],\"home\":true},\"video\":{\"choice\":{\"id\":\"cielo\",\"name\":\"Sky\",\"size\":3,\"seed\":31,\"words\":[\"SUN\",\"LIGHT\",\"MOON\",\"CLOUD\"],\"number\":1,\"difficulty\":\"Fácil\",\"language\":\"en\"},\"data\":{\"version\":1,\"completed\":[],\"freeCompleted\":[],\"progress\":{},\"customs\":[]},\"found\":[],\"keys\":[],\"videoWords\":[{\"text\":\"MOON\",\"path\":[13,15,3,0]},{\"text\":\"CLOUD\",\"path\":[17,26,23,16,8]}]}};const key='__SCENE__';const scene=scenes[key];if(!scene)return false;if(localStorage.getItem('marketing-scene')!==key){localStorage.clear();localStorage.setItem('marketing-scene',key);localStorage.setItem('sopa-language','en');localStorage.setItem('sopa-theme','light');localStorage.setItem('sopa-sound','false');localStorage.setItem('sopa-player-en-v1',JSON.stringify(scene.data));location.reload();return false;}if(scene.home)return !!document.querySelector('.home-play');const stage=document.querySelector('.cube-stage[data-ready=\"true\"]');if(stage){if(key==='video'){if(!window.__marketingVideo){window.__marketingVideo=true;(async function(scene){\n const stage=document.querySelector('.cube-stage'),wait=ms=>new Promise(r=>setTimeout(r,ms)),events=[],used=new Set();\n const emit=name=>{const row={name,epoch:Date.now()/1000,distance:Number(stage.dataset.distance),rotation:stage.dataset.rotation,found:[...document.querySelectorAll('.word-list li.complete')].map(e=>e.textContent)};events.push(row);window.webkit?.messageHandlers?.marketingAutomation?.postMessage(JSON.stringify(row));};\n const ease=t=>t*t*(3-2*t);\n const drag=async(dx,dy,ms)=>{const b=stage.getBoundingClientRect(),x=b.x+b.width*.40,y=b.y+b.height*.48;const capture=stage.setPointerCapture;stage.setPointerCapture=()=>{};const event=(type,cx,cy)=>stage.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:99,pointerType:'touch',button:0,buttons:type==='pointerup'?0:1,clientX:cx,clientY:cy}));event('pointerdown',x,y);const begin=performance.now();while(performance.now()-begin<ms){const t=Math.min(1,(performance.now()-begin)/ms);event('pointermove',x+dx*ease(t),y+dy*ease(t)+Math.sin(t*Math.PI)*7);await wait(16);}event('pointermove',x+dx,y+dy);event('pointerup',x+dx,y+dy);stage.setPointerCapture=capture;await wait(260);};\n const zoom=async(total,ms)=>{let previous=0;const begin=performance.now();while(performance.now()-begin<ms){const t=Math.min(1,(performance.now()-begin)/ms),next=total*ease(t);stage.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:next-previous}));previous=next;await wait(16);}stage.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:total-previous}));await wait(320);};\n const select=async(w)=>{emit(w.text+'_START');for(const id of w.path){const cell=document.querySelector(`[data-cell=\"${id}\"]`);if(used.has(id)||cell.classList.contains('found'))throw Error('Already selected '+id);cell.click();used.add(id);await wait(610);}if(![...document.querySelectorAll('.word-list li.complete')].some(e=>e.textContent===w.text))throw Error('Word not found '+w.text);emit(w.text+'_DONE');};\n try{await wait(8000);emit('START');await drag(55,12,1700);emit('ROTATE_INTRO');await zoom(-90,1200);emit('ZOOM_IN');await drag(-16,14,900);emit('REFRAME_ONE');await wait(350);await select(scene.videoWords[0]);await wait(750);await drag(-82,24,1900);emit('ROTATE_SECOND');await zoom(60,1100);emit('ZOOM_OUT');await drag(22,-12,900);emit('REFRAME_TWO');await wait(350);await select(scene.videoWords[1]);await wait(1800);await drag(32,8,1000);emit('FINAL_ROTATE');await wait(1600);emit('END');window.__marketingVideoEvents=events;window.__marketingVideoDone=true;}catch(e){emit('ERROR_'+String(e));throw e;}\n})(scene);}return true;}if(!window.__marketingPose){window.__marketingPose=true;(async()=>{for(const key of [...scene.keys,...(window.innerWidth>=800?(scene.tabletExtraKeys||[]):[])]){stage.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));await new Promise(r=>setTimeout(r,90));}window.__marketingPoseDone=true;})();}return true;}const level=[...document.querySelectorAll('button[aria-label]')].find(e=>e.getAttribute('aria-label').startsWith('Level '+scene.choice.number+' of 24:'));if(level){level.click();return false;}const modes=document.querySelector('.mode-card.green');if(modes){modes.click();return false;}const play=document.querySelector('.home-play');if(play){play.click();return false;}return false;})()".replacingOccurrences(of: "__SCENE__", with: key)
            prepareMarketing(controller, script: script, attempt: 0)
        }
        #endif

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        NSLog("MARKETING_EVENT %@", String(describing: message.body))
    }
    #if DEBUG
    private func prepareMarketing(_ controller: CAPBridgeViewController, script: String, attempt: Int) {
        guard attempt < 70 else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in
            if !self!.marketingHandlerInstalled, let web = controller.webView {
                web.configuration.userContentController.add(self!, name: "marketingAutomation")
                self!.marketingHandlerInstalled = true
            }
            controller.webView?.evaluateJavaScript(script) { result, error in
                if (result as? Bool) != true { self?.prepareMarketing(controller, script: script, attempt: attempt + 1) }
            }
        }
    }
    #endif

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
