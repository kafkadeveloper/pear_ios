function send(tid, uuid, language, app_version, duration) {
  fetch('https://ssl.google-analytics.com/collect?' + 'v=1&tid=' + tid 
                                                    + '&ds=app&cid=' + uuid
                                                    + '&ul=' + language
                                                    + '&t=event&an=Pear%20App&av='
                                                    +  app_version
                                                    + '&ec=Audio&ea=call&el=Duration&ev='
                                                    + duration);
}

module.exports = send;

