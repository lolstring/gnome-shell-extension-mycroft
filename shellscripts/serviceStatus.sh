#!/usr/bin/env bash


_module=""
function name-to-script-path() {
    case ${1} in
        "bus")               _module="mycroft.messagebus.service" ;;
        "skills")            _module="mycroft.skills" ;;
        "audio")             _module="mycroft.audio" ;;
        "voice")             _module="mycroft.client.speech" ;;
        "cli")               _module="mycroft.client.text" ;;
        "audiotest")         _module="mycroft.util.audio_test" ;;
        "audioaccuracytest") _module="mycroft.audio-accuracy-test" ;;
        "enclosure")         _module="mycroft.client.enclosure" ;;

        *)
            echo "Error: Unknown name '${1}'"
            exit 1
    esac
}


function check-running() {
    name-to-script-path ${1}
    if pgrep -f "python3 -m ${_module}" > /dev/null ; then 
        echo "${_module} is running"
        return 1;
    else 
        echo "${_module} is NOT running" 
        exit 1;
    fi
}

echo "check running services"
check-running bus
check-running skills
check-running audio
check-running voice

exit 0;