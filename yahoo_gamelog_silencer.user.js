// ==UserScript==
// @name         Yahoo Gamelog Silencer
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  try to take over the world!
// @author       You
// @match        https://gamelog-games.yahoo.co.jp/game/top/*/*
// @match        https://gamelog-games.yahoo.co.jp/thread/detail/*
// @grant        GM_addValueChangeListener
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_info
// ==/UserScript==

(function() {
    'use strict';

    //新着と見なす期間(日数)
    const fresh_period = 3;

    //画像の縮小率
    const image_shrink_ratio = "25%";

    //非表示スレッド・コメントの背景色
    const muted_color = "gray";

    //古いコメントの背景色
    const old_color = "silver";

    //デバッグモード
    const debug_mode = false;

    const debug = {
        log: function(...args) {
            if (!debug_mode) return
            console.log(`[DEBUG]${GM_info.script.name}:`, ...args)
        }
    }

    const EventEmitter = function(){
        this.events = {}
    }

    EventEmitter.prototype.on = function(eventName, fn){
        this.events[eventName] = this.events[eventName] || []
        this.events[eventName].push(fn)
    }

    EventEmitter.prototype.emit = function(eventName, data){
        if(this.events[eventName]){
            this.events[eventName].forEach(fn => fn(data))
        }
    }

    const repository = (function() {
        return {
            get: function(name, default_value, type){
                switch (type) {
                    case Set:
                        return new Set(JSON.parse(GM_getValue(name, default_value)))
                        break;
                    default:
                        return JSON.parse(GM_getValue(name, default_value))
                }
            },
            set: function(name, value, type){
                switch (type) {
                    case Set:
                        GM_setValue(name, JSON.stringify([...value]))
                        break;
                    default:
                        GM_setValue(name, JSON.stringify(value))
                }
            }
        }
    })();

    const makeObservableState = function(name, repository, default_state=new Set()){
        const inner_state = repository.get(name, JSON.stringify([...default_state]), Set)

        return {
            add(id) {
                inner_state.add(id)
                this.emitter.emit('add', id)
                repository.set(name, inner_state, Set)
            },
            delete(id){
                inner_state.delete(id)
                this.emitter.emit('delete', id)
                repository.set(name, inner_state, Set)
            },
            forEach() {
                Set.prototype.forEach.apply(inner_state, arguments)
            },
            emitter: new EventEmitter()
        }
    }

    //Mute State
    const mute_state = {
        comments: makeObservableState('mute_comments', repository)
      , threads: makeObservableState('mute_threads', repository)
      , users: makeObservableState('mute_users', repository)
    }

    //Mute Menu for Each Comment
    const mute_menu = (function(){
      const mute_menu_config = {
          comment: {
              class_name: "mute_comment"
            , label: "コメ非表示"
            , state: "comments"
            , is_muted: function(e) {
                return Boolean(e.target.closest('.muted_comment'))
            }
            , get_id: function(e) {
                  const comment_id = e.target.closest('.gmTControlMenu.gml-hide-target').parentNode.querySelector('.gmTControlArrow.gml-control-arrow').getAttribute('data-comment-id')
                  return comment_id
              }
          }
        , thread: {
              class_name: "mute_thread"
            , label: "スレ非表示"
            , state: "threads"
            , is_muted: function(e) {
                return Boolean(e.target.closest('.muted_thread'))
            }
            , get_id: function(e) {
                const thread = e.target.closest('.gmTthreadSet.gml-del-head') || e.target.closest('.gmDthreadSet.gml-del-head')
                const thread_id = thread.getAttribute('data-thread-comment-id') || thread.getAttribute('data-comment-id')
                return thread_id
            }
          }
        , user: {
              class_name: "mute_user"
            , label: "ユーザー非表示"
            , state: "users"
            , is_muted: function(e) {
                return Boolean(e.target.closest('.muted_user'))
            }
          , get_id: function(e) {
                const user_id = e.target.closest('.gmTControlMenu.gml-hide-target')
                                 .parentNode.querySelector('.gmTBallUserNameres > .name > a, .gmTBallUserNameOwner > .name > a')
                                 .getAttribute('href')
                                 .replace(/\/?user\/(.*)\//, "$1")
                return user_id
            }
        }
      }

      function mute_menu_clicked(e, name){
          debug.log("mute_menu_clicked:", name)
          e.preventDefault()
          const config = mute_menu_config[name]
          const id = config.get_id(e)

          if (config.is_muted(e)) {
              debug.log("unmute:", name, ":",id)
              mute_state[config.state].delete(id)
          }
          else {
              debug.log("mute:", name, ":",id)
              mute_state[config.state].add(id)
          }

          hide_popup(e)
          hide_smokeScreen()
      }

      function hide_smokeScreen(){
          document.querySelector('#smokeScreen').setAttribute('style', 'display: none;')
      }

      function hide_popup(e){
          e.target.closest('.gmTControlMenu.gml-hide-target').setAttribute('style', 'display: none;')
      }

      function add_mute_menu(){
          document.querySelectorAll('ul.gmTControlMenu.gml-hide-target').forEach(i=> {
              if (! i.classList.contains('mute_menu')){
                  i.classList.add('mute_menu')
                  for (const [key, config] of Object.entries(mute_menu_config)) {
                      const menu = `<li><a class="${config.class_name}" href="javascript:void(0)">&nbsp;&nbsp;&nbsp;&nbsp;${config.label}<span class="check_mark">&nbsp;&#10004;</span></a></li>`
                      i.insertAdjacentHTML('beforeend', menu)
                      i.querySelector(`a.${config.class_name}`).addEventListener('click', function(e){ mute_menu_clicked(e, key) }, false)
                  }
              }
          })
      }
      function add_style(){
          GM_addStyle(`.muted_thread, .muted_comment, .muted_user {background-color: ${muted_color} !important;}`)
          GM_addStyle('.mute_on .muted_thread, .mute_on .muted_comment, .mute_on .muted_user {display: none !important;}')
          GM_addStyle('.muted_thread .mute_thread, .muted_comment .mute_comment, .muted_user .mute_user {color: brown !important;}')
          GM_addStyle('.mute_thread .check_mark, .mute_comment .check_mark, .mute_user .check_mark {visibility: hidden !important;}')
          GM_addStyle('.muted_thread .mute_thread .check_mark, .muted_comment .mute_comment .check_mark, .muted_user .mute_user .check_mark {visibility: visible !important;}')
      }

      return {
        add: function(){
          add_style()
          add_mute_menu()
        }
      }
    })();

    //Muter
    const muter = (function(){
      const actions = Object.freeze({
          mute: Symbol("mute")
        , unmute: Symbol("unmute")
      })

      const action_config = {
        comment: {
          class_name: 'muted_comment'
          , selector: (id) => `div.gmTControlArrow.gml-control-arrow[data-comment-id="${id}"]`
          , mapper: (x) => x.parentNode
        }

        , thread: {
          class_name: 'muted_thread'
          , selector: (id) => `.gmTthreadSet.gml-del-head[data-thread-comment-id="${id}"], .gmDthreadSet.gml-del-head[data-comment-id="${id}"]`
          , mapper: (x) => x
        }

        , user: {
          class_name: 'muted_user'
          , selector: (id) => `.gmTBallUserNameres > .name > a[href$="user/${id}/"], .gmTBallUserNameOwner > .name > a[href$="user/${id}/"]`
          , mapper: (x) => (x.closest('.gmTBallUserNameres')|| x.closest('.gmTBallUserNameOwner')).parentNode
        }
      }

      const makeAction = (config) => (action) => (id) =>{
        Array.from(document.querySelectorAll(config.selector(id)))
          .filter(i => i)
          .map(config.mapper)
          .forEach(i=>{
            switch (action) {
              case actions.mute:
                i.classList.add(config.class_name)
                break;
              case actions.unmute:
                i.classList.remove(config.class_name)
                break;
            }
          })
      }

      return {
        comment: {
          mute: makeAction(action_config.comment)(actions.mute)
        , unmute: makeAction(action_config.comment)(actions.unmute)
        }
      , thread: {
          mute: makeAction(action_config.thread,)(actions.mute)
        , unmute: makeAction(action_config.thread)(actions.unmute)
        }
      , user: {
          mute: makeAction(action_config.user)(actions.mute)
        , unmute: makeAction(action_config.user)(actions.unmute)
        }
      }

    })();

    function mute_all(){
      for (let key of Object.keys(mute_state)){
        const name = key.slice(0, -1)
        mute_state[key].forEach(id => muter[name].mute(id))
      }
    }

    function add_observers(){
      for (let key of Object.keys(mute_state)) {
        const name = key.slice(0, -1)
        mute_state[key].emitter.on('add', muter[name].mute)
        mute_state[key].emitter.on('delete', muter[name].unmute)
      }
    }

    // Time Filter
    // timefilter[key].mute(days)
    const timefilter = (function() {
      const actions = Object.freeze({
          mute: Symbol("mute")
      })

      const is_old = (element, days) => {
          return element.getAttribute('data-timestamp') * 1000 < new Date().setDate(new Date().getDate() - days)
      }

      const is_thread_old = (days) => (x) => {
        var element = x.querySelector('.gmTBallUserNameOwner > .name > .time');
        return element ? is_old(element, days) : false
      }

      const is_last_comment_old = (days) => (x) => {
        var element = x.querySelector('.gmTBallUserNameres > .timeRankArea > .time');
        return element ? is_old(element, days) : true
      }

      const action_config = {
        comment: {
          class_name: 'old_comment'
          , selector: () => '.gml-del-head:not(.gmTthreadSet) > .gmTBallUserNameres > .timeRankArea > .time'
          , filter: (days) => (x) => {
              return is_old(x, days)
            }
          , mapper: (x) => {return x.closest('.gml-del-head')}
        }

        , thread: {
          class_name: 'old_thread'
          , selector: () => '.gmTthreadSet'
          , filter: (days) => (x) => {
              return is_thread_old(days)(x) && is_last_comment_old(days)(x)
            }
          , mapper: (x) => {return x.closest('.gmTthreadSet')}
        }
      }



      const makeAction = (config) => (action) => (days) =>{
        Array.from(document.querySelectorAll(config.selector()))
          .filter(config.filter(days))
          .map(config.mapper)
          .forEach(i=>{
            switch (action) {
              case actions.mute:
                i.classList.add(config.class_name)
                break;
            }
          })
      }

      return {
        old_comment: {
          mute: makeAction(action_config.comment)(actions.mute)
        }
      , old_thread: {
          mute: makeAction(action_config.thread,)(actions.mute)
        }
      }
    })();

    function mute_old(){
      GM_addStyle(`.old_comment, .old_thread {background-color: ${old_color};}`)
      GM_addStyle('.hide_old_on .old_comment, .hide_old_on .old_thread {display: none !important;}')

      timefilter.old_comment.mute(fresh_period)
      timefilter.old_thread.mute(fresh_period)
    }

    const trigger_load = (function () {
        let num_before = 0;
        return ({force=false}={}) => {
            const num_after = document.querySelectorAll('.gml-del-head:not(.gmDthreadSet)').length
            if (force || num_after >= num_before + 100){
                debug.log("dispatch scroll event");
                num_before = num_after;
                window.dispatchEvent(new Event('scroll'));
            }
        }
    })();

    //Top Bar Buttons
    const button_observer = new Set([])

    const button_state = (function(repository, observer){
        const inner_state = {
            mute: repository.get('mute', true)
          , shrink: repository.get('shrink', true)
          , hide_old: repository.get('hide_old', true)
        }

        const state_handler = {
            set(target, key, value) {
                debug.log("state_handler called:", key, value, typeof(value))
                observer.forEach(func => func(key, value))
                target[key] = value;
                repository.set(key, value, typeof(value))
            }
        }
        return new Proxy(inner_state, state_handler);
    })(repository, button_observer);

    const button = (function(button_state, observer){
        const config = {
            mute: { class_name: "mute_button"
                   , label: "非表示"
                   , handler: toggle_mute
                  }
          , shrink: { class_name: "shrink_button"
                    , label: "画像縮小"
                    , handler: toggle_shrink
                    }
          , hide_old: { class_name: "hide_old_button"
                      , label: "新着のみ"
                      , handler: toggle_hide_old
                      }
        }

        function add_style(){
            debug.log("add_style called")
            GM_addStyle('.mute_on .mute_button > span {color: red !important;}')
            GM_addStyle('.mute_button > span {color: gray !important;}')
            GM_addStyle(`.shrink_on .userCommentImg {width: ${image_shrink_ratio} !important;}`)
            GM_addStyle('.shrink_on .shrink_button > span {color: red !important;}')
            GM_addStyle('.shrink_button > span {color: gray !important;}')
            GM_addStyle('.hide_old_on .hide_old_button > span {color: red !important;}')
            GM_addStyle('.hide_old_button > span {color: gray !important;}')
        }

        function toggle_mute(e) {
            button_state.mute = !button_state.mute
        }

        function toggle_shrink(e) {
            button_state.shrink = !button_state.shrink
        }

        function toggle_hide_old(e) {
            button_state.hide_old = !button_state.hide_old

            //trigger loading in case there are no fresh comment loaded
            setTimeout(()=>trigger_load({force:true}), 300)
        }

        function state_changed(key, state){
            if (state === true) {
                document.querySelector('#wrapper').classList.add(`${key}_on`)
                document.querySelector(`.${key}_button > span`).innerText = "ON"
            }
            else {
                document.querySelector('#wrapper').classList.remove(`${key}_on`)
                document.querySelector(`.${key}_button > span`).innerText = "OFF"
            }
        }

        function initialize_state(){
            for (let key in button_state) {
                debug.log("initialize_state => this:", this)
                state_changed(key, button_state[key])
            }
        }

        return {
            initialize: function(){
                for (let key in config) {
                    const button = config[key]
                    const button_html = `<li class="gmlNavRightItem"><a class="${button.class_name}" href="javascript:void(0)">${button.label}<span></span></li>`
                    document.querySelector('#gmlNav > .gmlNavInner').insertAdjacentHTML('beforeend', button_html)
                    document.querySelector(`.${button.class_name}`).addEventListener('click', button.handler)
                }
                initialize_state()
                observer.add(state_changed)
                add_style()
            }
        }
    })(button_state, button_observer);

    //Apply mute after XHR loadend
    const original_open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        debug.log('request started!');
        this.addEventListener('loadend', function() {
            debug.log('AJAX request completed!');
            mute_menu.add()
            mute_all()
            mute_old()
            trigger_load()
        });
        original_open.apply(this, arguments);
    };

    button.initialize()
    mute_menu.add()
    mute_all()
    add_observers()
    mute_old()
    trigger_load()

})();
