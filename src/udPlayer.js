require('./udPlayer.scss');

const Util = {
    leftDistance: (el) => {
        let left = el.offsetLeft;
        let scrollLeft;
        while (el.offsetParent) {
            el = el.offsetParent;
            left += el.offsetLeft;
        }
        scrollLeft = document.body.scrollLeft + document.documentElement.scrollLeft;
        return left - scrollLeft;
    },
    timeFormat: (time) => {
        let tempMin = parseInt(time / 60);
        let tempSec = parseInt(time % 60);
        let curMin = tempMin < 10 ? ('0' + tempMin) : tempMin;
        let curSec = tempSec < 10 ? ('0' + tempSec) : tempSec;
        return curMin + ':' + curSec;
    },
    percentFormat: (percent) => {
        return (percent * 100).toFixed(2) + '%';
    },
    ajax: (option) => {
        option.beforeSend && option.beforeSend();
        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = () => {
            if(xhr.readyState === 4){
                if(xhr.status >= 200 && xhr.status < 300){
                    option.success && option.success(xhr.responseText);
                }else{
                    option.fail && option.fail(xhr.status);
                }
            }
        };
        var form = new FormData();
        for(let tmp in option.data) {
            form.append(tmp, option.data[tmp]);
        }
        xhr.open('POST',option.url);
        xhr.send(form);
    }
};
let instance = false;
const baseUrl = 'http://localhost:8080/';

class udPlayer {
    constructor(option){
        if(instance){
            console.error('udPlayer只能存在一个实例！');
            return Object.create(null);
        }else{
            instance = true;
        }
        Util.ajax({
            url: baseUrl + 'getConfigs',
            data: {userName : option.userName},
            beforeSend: () => {
                console.log('正在加载配置……');
            },
            success: (configs) => {
                //播放器属性
                let config = JSON.parse(configs);
                const defaultOption = {
                    username: option.userName,
                    element: document.getElementById('udPlayer'),
                    autoplay: config.autoPlay,
                    volume: config.volume,
                    eject: config.eject,
                    showeva: config.showEva,
                    mode: 'listloop',
                    defaultplay: config.defaultPlay,
                    listshow: config.listShow,
                    evatime: config.evaTime,
                    playertype: config.playerType,
                    showLrc: config.showLrc
                };
                this.option = defaultOption;

                this.root = this.option.element;

                //控制暂停和播放
                this.toggle = this.toggle.bind(this);
                //控制列表的显示
                this.toggleList = this.toggleList.bind(this);
                //控制播放器模式，目前支持两种
                this.switchMode = this.switchMode.bind(this);
                //控制播放器暂停
                this.hideMode = this.hideMode.bind(this);
                //播放器歌单列表切换
                this.albumMode = this.albumMode.bind(this);
                //下上一首
                this.next = this.next.bind(this);
                this.prev = this.prev.bind(this);
                //声音控制
                this.toggleMute = this.toggleMute.bind(this);

                this.root.innerHTML = '<p class="udPlayer-tip-loading">LOADING</p>';

                let songList = [];
                let songInList = [];
                Util.ajax({
                    url: baseUrl + 'player/getListWithSongs',
                    data: {userName : this.option.username},
                    beforeSend: () => {
                        console.log('正在拉取歌单……');
                    },
                    success: (data) => {
                        for(let tmp of JSON.parse(data)) {
                            songList.push(tmp);
                        }
                        if(this.option.defaultplay >= songList.length) {
                            this.option.defaultplay = 0;
                        } else this.option.defaultplay -= 1;
                        for(let song of songList[this.option.defaultplay].songs) {
                            songInList.push(this.deal(song));
                        }
                        let tmp = this;
                        tmp.songList = songList;
                        tmp.music = songInList;
                        tmp.root.innerHTML = tmp.template();
                        tmp.init();
                        tmp.bind();
                    },
                    fail: (status) => {
                        console.error('歌单拉取失败！ 错误码：' + status);
                    }
                });
            },
            fail: (status) => {
                console.error('配置加载出错！ 错误码：' + status);
            }
        });
    }

    deal(songdetail) {
        let song = {};
        song.name = songdetail.songName;
        song.cover = songdetail.picUrl;
        song.id = songdetail.id;
        song.songId = songdetail.songId;
        song.type = songdetail.songType;
        song.author = songdetail.artist;
        song.album = songdetail.album;
        song.evaluate = songdetail.evaluate;
        return song;
    }

    template(){
        let html = `
            <div class="udPlayer-eva-win">
                <div class="win-close">X</div>
                <p class="win-title">博主：</p>
                <p class="win-content" title="${this.music[0].evaluate}">${this.music[0].evaluate}</p>
            </div>
            <audio class="udPlayer-source" src="${this.music[0].type === 'file' ? this.music[0].src : ''}" preload="auto"></audio>
            <div class="udPlayer-hide" title="点击收起/展开"><div>&nbsp\<</div></div>
            <div class="udPlayer-picture">
                <img class="udPlayer-cover" src="${this.music[0].cover}" alt="">
                <a href="javascript:;" class="udPlayer-play-btn">
                    <span class="udPlayer-left"></span>
                    <span class="udPlayer-right"></span>
                </a>
            </div>
            <div class="udPlayer-control">
                <p class="udPlayer-name">${this.music[0].name}</p>
                <p class="udPlayer-author">${this.music[0].author}</p>
                <div class="udPlayer-percent">
                    <div class="udPlayer-line-loading"></div>
                    <div class="udPlayer-line"></div>
                </div>
                <p class="udPlayer-time">
                    <span class="udPlayer-cur">${'00:00'}</span>/<span class="udPlayer-total">${'00:00'}</span>
                </p>
                <div class="udPlayer-volume">
                    <i class="udPlayer-icon"></i>
                    <div class="udPlayer-percent">
                        <div class="udPlayer-line"></div>
                    </div>
                </div>
                <div class="udPlayer-list-order">
                    <div class="udPlayer-list-pre" title="上一首"><span class="udPlayer-arrow1"></span><span class="udPlayer-arrow2"></span></div>
                    <div class="udPlayer-list-nxt" title="下一首"><span class="udPlayer-arrow1"></span><span class="udPlayer-arrow2"></span></div>
                </div>
                <div class="udPlayer-list-switch">
                    <i class="udPlayer-list-icon"></i>
                </div>
                <i class="${this.option.mode === 'singleloop' ? 'udPlayer-mode udPlayer-mode-loop' : 'udPlayer-mode'}"></i>
            </div>
            <div class="udPlayer-list">
            <ul class="udPlayer-album-list">`;
            for(let index in this.songList){
                html += `
                        <li data-index="${index}">
                            <i class="udPlayer-list-sign"></i>
                            <span class="udPlayer-list-index">${parseInt(index) + 1}</span>
                            <span class="udPlayer-list-name" title="${this.songList[index].listName}">${this.songList[index].listName}</span>
                            <span class="udPlayer-list-author" title=">">\></span>
                            <div class="udPlayer-list-des">${this.songList[index].des}`;
                for(let i = 0; i < 105; i ++){
                    html += '&nbsp';
                }
                html += `</div></li>`;
            }
            html += `
            </ul>
            <div class="udPlayer-song-title">
                <span class="udPlayer-title-sign">\<</span>
                <span class="udPlayer-title-name" title="${this.songList[0].listName}">${this.songList[0].listName}</span>
            </div>
            <ul class="udPlayer-song-list" data-index="0">`;
            for(let index in this.music){
                html += `
                    <li data-index="${index}">
                        <i class="udPlayer-list-sign"></i>
                        <span class="udPlayer-list-index">${parseInt(index) + 1}</span>
                        <span class="udPlayer-list-name" title="${this.music[index].name}">${this.music[index].name}</span>
                        <span class="udPlayer-list-author" title="${this.music[index].author}">${this.music[index].author}</span>
                        <div class="udPlayer-list-des">${this.music[index].evaluate}`;
                for(let i = 0; i < 105; i ++){
                    html += '&nbsp';
                }
                html += `</div></li>`;
            }
            html += `
            </ul>
            </div>
        `;
        return html;
    }

    init(){
        this.dom = {
            evawin: this.root.querySelector('.udPlayer-eva-win'),
            evawinbtn: this.root.querySelector('.udPlayer-eva-win .win-close'),
            cover: this.root.querySelector('.udPlayer-cover'),
            playbutton: this.root.querySelector('.udPlayer-play-btn'),
            hidebutton: this.root.querySelector('.udPlayer-hide'),
            name: this.root.querySelector('.udPlayer-name'),
            author: this.root.querySelector('.udPlayer-author'),
            timeline_total: this.root.querySelector('.udPlayer-percent'),
            timeline_loaded: this.root.querySelector('.udPlayer-line-loading'),
            timeline_played: this.root.querySelector('.udPlayer-percent .udPlayer-line'),
            timetext_total: this.root.querySelector('.udPlayer-total'),
            timetext_played: this.root.querySelector('.udPlayer-cur'),
            volumebutton: this.root.querySelector('.udPlayer-icon'),
            volumeline_total: this.root.querySelector('.udPlayer-volume .udPlayer-percent'),
            volumeline_value: this.root.querySelector('.udPlayer-volume .udPlayer-line'),
            preMusic: this.root.querySelector('.udPlayer-list-pre'),
            nxtMusic: this.root.querySelector('.udPlayer-list-nxt'),
            switchbutton: this.root.querySelector('.udPlayer-list-switch'),
            modebutton: this.root.querySelector('.udPlayer-mode'),
            albumlist: this.root.querySelector('.udPlayer-album-list'),
            musiclist: this.root.querySelector('.udPlayer-song-list'),
            musictitle: this.root.querySelector('.udPlayer-song-title'),
            musicitem: this.root.querySelectorAll('.udPlayer-song-list li'),
            albumitem: this.root.querySelectorAll('.udPlayer-album-list li'),
            returnalbum: this.root.querySelector('.udPlayer-title-sign'),
            lrcBlock: document.querySelector('#udPlayer-lrc'),
            lrcList: document.querySelector('#udPlayer-lrc .udPlayer-lrc-list')
        };
        this.audio = this.root.querySelector('.udPlayer-source');
        require('./colorType' + this.option.playertype + '.scss');
        if(this.option.listshow === 1){
            this.root.classList.add('udPlayer-list-on');
        }
        if(this.option.eject === 0) {
            this.root.classList.add('udPlayer-hided');
            this.root.querySelector('.udPlayer-hide').getElementsByTagName('div')[0].innerHTML = "&nbsp;>";
        }
        if(this.option.mode === 'singleloop'){
            this.audio.loop = true;
        }
        if(this.option.showLrc === 0) {
            this.dom.lrcBlock.classList.add('udPlayer-lrc-hide');
        }
        if(this.option.showeva === 0) {
            this.dom.evawin.classList.add('win-hide');
        }
        if(this.option.volume < 100) {
            this.dom.volumeline_value.style.width = Util.percentFormat(this.option.volume/100);
            this.audio.volume = this.option.volume/100;
            if(this.audio.muted){
                this.toggleMute();
            }
        }
        this.dom.musicitem[0].className = 'udPlayer-curMusic';
        this.dom.albumitem[this.option.defaultplay].className = 'udPlayer-curAlbum';
        this.option.musicIndex = 0;
        Util.ajax({
            url: baseUrl + 'player/getSongOL',
            data: {id : this.music[0].songId , type: this.music[0].type},
            beforeSend: () => {
                console.log('正在拉取歌曲……');
            },
            success: (data) => {
                let url = JSON.parse(data).sourceUrl;
                if(url !== null){
                    console.log('歌曲拉取成功！');
                    this.audio.src = url;
                    if(this.option.autoplay === 1) {
                        this.play();
                    }
                }else{
                    console.log('歌曲拉取失败！ 资源无效！');
                    if(this.music.length !== 1){
                        this.next();
                    }
                }
            },
            fail: (status) => {
                console.error('歌曲拉取失败！ 错误码：' + status);
            }
        });
    }

    bind(){
        this.updateLine = () => {
            let percent = this.audio.buffered.length ? (this.audio.buffered.end(this.audio.buffered.length - 1) / this.audio.duration) : 0;
            this.dom.timeline_loaded.style.width = Util.percentFormat(percent);
        };
        this.updateLrc(this.music[0]);
        this.audio.addEventListener('durationchange', (e) => {
            this.dom.timetext_total.innerHTML = Util.timeFormat(this.audio.duration);
            this.updateLine();
        });
        this.audio.addEventListener('progress', (e) => {
            this.updateLine();
        });
        this.audio.addEventListener('canplay', (e) => {
            if(this.option.autoplay){
                this.play();
            }
        });
        this.audio.addEventListener('timeupdate', (e) => {
            let percent = this.audio.currentTime / this.audio.duration;
            this.dom.timeline_played.style.width = Util.percentFormat(percent);
            this.dom.timetext_played.innerHTML = Util.timeFormat(this.audio.currentTime);
        });
        this.audio.addEventListener('seeked', (e) => {
            this.play();
        });
        this.audio.addEventListener('ended', (e) => {
            this.next();
        });
        this.dom.evawinbtn.addEventListener('click', (e) => {
            this.evaWinSwitch();
        });
        this.dom.playbutton.addEventListener('click', this.toggle);
        this.dom.hidebutton.addEventListener('click', this.hideMode);
        this.dom.switchbutton.addEventListener('click', this.toggleList);
        this.dom.modebutton.addEventListener('click', this.switchMode);
        this.dom.returnalbum.addEventListener('click', this.albumMode);
        this.dom.preMusic.addEventListener('click', this.prev);
        this.dom.nxtMusic.addEventListener('click', this.next);
        this.dom.volumebutton.addEventListener('click', this.toggleMute);
        this.dom.albumlist.addEventListener('click', (e) => {
            //根据行元素进行处理
            let target,index,curIndex,playIndex;
            if(e.target.tagName.toUpperCase() === 'LI'){
                target = e.target;
            }else if(e.target.parentElement.tagName.toUpperCase() === 'LI'){
                target = e.target.parentElement;
            }else{
                return;
            }
            index = parseInt(target.getAttribute('data-index'));
            playIndex = parseInt(this.dom.albumlist.querySelector('.udPlayer-curAlbum').getAttribute('data-index'));
            this.dom.musictitle.querySelector('.udPlayer-title-name').textContent = this.songList[index].listName;
            this.dom.musictitle.querySelector('.udPlayer-title-name').title = this.songList[index].listName;
            this.dom.musiclist.setAttribute('data-index', index.toString());
            let songInList = [];
            for(let song of this.songList[index].songs) {
                songInList.push(this.deal(song));
            }
            this.music = songInList;
            if(playIndex === index){
                this.refreshList(this.option.musicIndex);
            }else{
                this.refreshList(null);
            }
            this.albumMode();
        });
        this.dom.musiclist.addEventListener('click', (e) => {
            //根据行元素进行处理
            let target,index,curIndex;
            if(e.target.tagName.toUpperCase() === 'LI'){
                target = e.target;
            }else if(e.target.parentElement.tagName.toUpperCase() === 'LI'){
                target = e.target.parentElement;
            }else{
                return;
            }
            index = parseInt(target.getAttribute('data-index'));
            this.option.musicIndex = index;
            if(this.dom.musiclist.querySelector('.udPlayer-curMusic') === null){
                return this.switchMusic(index + 1);
            }
            curIndex = parseInt(this.dom.musiclist.querySelector('.udPlayer-curMusic').getAttribute('data-index'));
            if(index === curIndex){
                this.play();
            }else{
                this.switchMusic(index + 1);
            }
        });
        this.dom.timeline_total.addEventListener('click', (event) => {
            let e = event || window.event;
            let percent = (e.clientX - Util.leftDistance(this.dom.timeline_total)) / this.dom.timeline_total.clientWidth;
            if(!isNaN(this.audio.duration)){
                this.dom.timeline_played.style.width = Util.percentFormat(percent);
                this.dom.timetext_played.innerHTML = Util.timeFormat(percent * this.audio.duration);
                this.audio.currentTime = percent * this.audio.duration;
            }
        });
        this.dom.volumeline_total.addEventListener('click', (event) => {
            let e = event || window.event;
            let percent = (e.clientX - Util.leftDistance(this.dom.volumeline_total)) / this.dom.volumeline_total.clientWidth;
            this.dom.volumeline_value.style.width = Util.percentFormat(percent);
            this.audio.volume = percent;
            if(this.audio.muted){
                this.toggleMute();
            }
        });
        this.desScroll();
    }

    prev(){
        let index = parseInt(this.dom.musiclist.querySelector('.udPlayer-curMusic').getAttribute('data-index'));
        if(index === 0){
            if(this.music.length === 1){
                this.play();
            }else{
                this.switchMusic(this.music.length - 1 + 1);
            }
        }else{
            this.switchMusic(index - 1 + 1);
        }
    }

    next(){
        let index = parseInt(this.dom.musiclist.querySelector('.udPlayer-curMusic').getAttribute('data-index'));
        if(index === (this.music.length - 1)){
            if(this.music.length === 1){
                this.play();
            }else{
                this.switchMusic(1);
            }
        }else{
            this.switchMusic(index + 1 + 1);
        }
    }

    switchMusic(index){
        let curMusic = this.dom.musiclist.querySelector('.udPlayer-curMusic');
        if(typeof index !== 'number'){
            console.error('请输入正确的歌曲序号！');
            return;
        }
        index -= 1;
        if(index < 0 || index >= this.music.length){
            console.error('请输入正确的歌曲序号！');
            return;
        }
        if(curMusic !== null && parseInt(index) === parseInt(curMusic.getAttribute('data-index'))){
            this.play();
            return;
        }
        if(curMusic !== null){
            curMusic.classList.remove('udPlayer-curMusic');
            this.dom.musicitem[index].classList.add('udPlayer-curMusic');
        }else{
            this.dom.albumlist.querySelector('.udPlayer-curAlbum').classList.remove('udPlayer-curAlbum');
            this.dom.albumitem[parseInt(this.dom.musiclist.getAttribute('data-index'))].classList.add('udPlayer-curAlbum');
            this.dom.musicitem[index].className = 'udPlayer-curMusic';
        }
        this.dom.evawin.querySelector('.win-content').textContent = this.music[index].evaluate;
        this.dom.evawin.querySelector('.win-content').title = this.music[index].evaluate;
        this.dom.name.innerHTML = this.music[index].name;
        this.dom.author.innerHTML = this.music[index].author;
        this.dom.cover.src = this.music[index].cover;
        this.updateLrc(this.music[index]);
        Util.ajax({
            url: baseUrl + 'player/getSongOL',
            data: {id : this.music[index].songId , type: this.music[index].type},
            beforeSend: () => {
                console.log('正在拉取歌曲……');
            },
            success: (data) => {
                let url = JSON.parse(data).sourceUrl;
                if(url !== null){
                    console.log('歌曲拉取成功！');
                    this.audio.src = url;
                    this.play();
                }else{
                    console.log('歌曲拉取失败！ 资源无效！');
                    if(this.music.length !== 1){
                        this.next();
                    }
                }
            },
            fail: (status) => {
                console.error('歌曲拉取失败！ 错误码：' + status);
            }
        });
    }

    play(){
        if(this.audio.paused){
            this.audio.play();
            this.evaWinSwitch();
            this.dom.playbutton.classList.add('udPlayer-pause');
            this.dom.cover.classList.add('udPlayer-pause');
        }
    }

    pause(){
        if(!this.audio.paused){
            this.audio.pause();
            this.dom.playbutton.classList.remove('udPlayer-pause');
            this.dom.cover.classList.remove('udPlayer-pause');
        }
    }

    toggle(){
        this.audio.paused ? this.play() : this.pause();
    }

    toggleList(){
        this.root.classList.contains('udPlayer-list-on') ? this.root.classList.remove('udPlayer-list-on') : this.root.classList.add('udPlayer-list-on');
    }

    toggleMute(){
        if(this.audio.muted){
            this.audio.muted = false;
            this.dom.volumebutton.classList.remove('udPlayer-quiet');
            this.dom.volumeline_value.style.width = Util.percentFormat(this.audio.volume);
        }else{
            this.audio.muted = true;
            this.dom.volumebutton.classList.add('udPlayer-quiet');
            this.dom.volumeline_value.style.width = '0%';
        }
    }

    hideMode() {
        if(this.root.classList.contains('udPlayer-hided')){
            this.root.classList.remove('udPlayer-hided');
            this.root.querySelector('.udPlayer-hide').getElementsByTagName('div')[0].innerHTML = "&nbsp;<";
        }else{
            this.root.classList.add('udPlayer-hided');
            this.root.querySelector('.udPlayer-hide').getElementsByTagName('div')[0].innerHTML = "&nbsp;>";
        }
    }

    albumMode() {
        this.dom.albumlist.classList.contains('udPlayer-songlist') ? this.dom.albumlist.classList.remove('udPlayer-songlist') : this.dom.albumlist.classList.add('udPlayer-songlist');
        this.dom.musiclist.classList.contains('udPlayer-songlist') ? this.dom.musiclist.classList.remove('udPlayer-songlist') : this.dom.musiclist.classList.add('udPlayer-songlist');
        this.dom.musictitle.classList.contains('udPlayer-songlist') ? this.dom.musictitle.classList.remove('udPlayer-songlist') : this.dom.musictitle.classList.add('udPlayer-songlist');
    }

    switchMode(){
        if(this.audio.loop){
            this.audio.loop = false;
            this.dom.modebutton.classList.remove('udPlayer-mode-loop');
        }else{
            this.audio.loop = true;
            this.dom.modebutton.classList.add('udPlayer-mode-loop');
        }
    }

    refreshList(musicIndex){
        let html = '';
        for(let index in this.music){
            html += `
                <li data-index="${index}">
                    <i class="udPlayer-list-sign"></i>
                    <span class="udPlayer-list-index">${parseInt(index) + 1}</span>
                    <span class="udPlayer-list-name" title="${this.music[index].name}">${this.music[index].name}</span>
                    <span class="udPlayer-list-author" title="${this.music[index].author}">${this.music[index].author}</span><div class="udPlayer-list-des">${this.music[index].evaluate}`;
            for(let i = 0; i < 105; i ++){
                html += '&nbsp';
            }
            html += `</div></li>`;
        }
        this.dom.musiclist.innerHTML = html;
        this.dom.musiclist = this.root.querySelector('.udPlayer-song-list');
        this.dom.musicitem = this.root.querySelectorAll('.udPlayer-song-list li');
        if(musicIndex !== null){
            this.dom.musicitem[musicIndex].classList.add('udPlayer-curMusic');
        }
        this.desScroll();
    }

    evaWinSwitch() {
        if(this.dom.evawin.classList.contains('win-appear')){
            this.dom.evawin.classList.remove('win-appear');
        }else{
            this.dom.evawin.classList.add('win-appear');
            if(this.option.evatime !== -1) {
                let evaclass = this.dom.evawin.classList;
                setTimeout( function(){
                    evaclass.remove('win-appear');
                }, this.option.evatime * 1000 );
            }
        }
    }

    desScroll(){
        for(let i of this.dom.musicitem){
            let songDetail = i.querySelector('.udPlayer-list-des');
            i.onmouseover = () => {
                songDetail.scrollFun = setInterval(() => {
                    if(songDetail.scrollLeft === (songDetail.scrollWidth - songDetail.clientWidth)){
                        songDetail.scrollLeft = 0;
                    }
                    else{
                        songDetail.scrollLeft++;
                    }
                }, 12);
            };

            i.onmouseout = () => {
                clearInterval(songDetail.scrollFun);
            };
        }

        for(let i of this.dom.albumitem){
            let songDetail = i.querySelector('.udPlayer-list-des');
            i.onmouseover = () => {
                songDetail.scrollFun = setInterval(() => {
                    if(songDetail.scrollLeft === (songDetail.scrollWidth - songDetail.clientWidth)){
                        songDetail.scrollLeft = 0;
                    }
                    else{
                        songDetail.scrollLeft++;
                    }
                }, 12);
            };

            i.onmouseout = () => {
                clearInterval(songDetail.scrollFun);
            };
        }
    }

    updateLrc(song) {
        Util.ajax({
            url: baseUrl + 'player/getLyric',
            data: {songId : song.songId , type: song.type},
            beforeSend: () => {
                console.log('正在拉取歌词……');
            },
            success: (data) => {
                let lrcJSON = JSON.parse(data);
                let lrcTime = [];//歌词对应的时间数组
                let ul = this.dom.lrcList;
                ul.innerHTML = "";
                if(lrcJSON.length == 0) {
                    ul.innerHTML = "<li><p>纯音乐， 请欣赏</p></li>";
                }
                let lrcIndex = 0;
                for(let jsonMem of lrcJSON) {
                    for(let key in jsonMem) {
                        //转化为秒
                        lrcTime[lrcIndex++] = parseFloat(key.substr(1,3)) * 60 + parseFloat(key.substring(4,10));
                        ul.innerHTML += "<li><p>"+jsonMem[key]+"</p></li>";
                    }
                }
                //如不另加一个结束时间，到最后歌词滚动不到最后一句
                lrcTime[lrcTime.length] = lrcTime[lrcTime.length - 1] + 3;

                let li = ul.getElementsByTagName("li");
                let currentLine = 0;//当前播放lrc行数
                let audio = this.audio;
                let currentTime;//当前播放的时间
                let nowLevel;//保存ul的translateY值
                let maxIndex = lrcTime.length;
                audio.ontimeupdate = () => {
                    currentTime = this.audio.currentTime;
                    for (let j = currentLine; j < maxIndex; j++){
                        if (currentTime < lrcTime[j + 1] && currentTime > lrcTime[j]){
                            currentLine =  j;
                            nowLevel = 0 - (currentLine * 32);
                            ul.style.transform = "translateY(" + nowLevel + "px)";
                            if(currentLine > 0)
                                li[currentLine - 1].classList.remove('on');
                            li[currentLine].classList.add('on');
                            break;
                        }
                    }
                };

                audio.onseeked = () => {
                    currentTime = audio.currentTime;
                    if(ul.querySelector('.on') !== null){
                        ul.querySelector('.on').classList.remove('on');
                    }
                    for (let k = 0; k < maxIndex; k ++){
                        if (currentTime < lrcTime[k + 1] && currentTime < lrcTime[k]){
                            currentLine = k;
                            break;
                        }
                    }
                };
            },
            fail: (status) => {
                console.error('歌词拉取失败！ 错误码：' + status);
            }
        });
    }

    destroy(){
        instance = false;
        this.audio.pause();
        this.root.innerHTML = '';
        for(let prop in this){
            delete this[prop];
        }
        console.log('该实例已销毁，可重新配置……');
    }
}
module.exports = udPlayer;
