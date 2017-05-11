#!/bin/bash

echo 'Install Script for Mycroft-core:';
echo 'Do you want to continue to installing Mycroft-core?(y/n)';
read answer
if echo "$answer" | grep -iq "^y"; then
	#first if
	declare -A osInfo;
	osInfo[/etc/redhat-release]=yum
	osInfo[/etc/debian_version]=apt-get
	osInfo[/etc/arch-release]=pacman
	echo 'Please specify the destination you want to install Mycroft-core (default is '$HOME'/Mycroft-core, leave blank for default):';
		read location
	location_NO_EXTERNAL_SPACE="$(echo -e "${location}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
	if [$location_NO_EXTERNAL_SPACE -eq '']; then
		dest=$HOME'/Mycroft-core'
	else
		dest=$location_NO_EXTERNAL_SPACE
	fi
	echo 'Destination set to : '$dest
	git --version 2>&1 >/dev/null
	GIT_IS_AVAILABLE=$?
	for f in ${!osInfo[@]}
		do
			if [[ -f $f ]]; then
				if [[ ${osInfo[$f]} == "apt-get" ]]; then
 	   				echo Installing
	   				if [ $GIT_IS_AVAILABLE -eq 1 ]; then 
						echo 'Git is not installed do you want to install git ?(y/n)';
						read answer
						if echo "$answer" | grep -iq "^y"; then
							gksudo apt-get install git
							git clone git://github.com/MycroftAi/mycroft-core/ $dest
							echo 'Git Cloned to '$dest 
							cd $dest
							git checkout master
							./build_host_setup_debian.sh
							./dev_setup.sh
							$abc = true	
						else
							echo 'Please install git and run install again or visit https://mycroft.ai for alternate methods'
				
							abc=false
							break;				
						fi
					else
						git clone git://github.com/MycroftAi/mycroft-core/ $dest
						cd $dest
						git checkout master
						./build_host_setup_debian.sh
						./dev_setup.sh
						abc=true
					fi
				elif [[ ${osInfo[$f]} == "yum" ]]; then
 	   				if [ $GIT_IS_AVAILABLE -eq 1 ]; then 
						echo 'Git is not installed do you want to install git ?(y/n)';
						read answer
						if echo "$answer" | grep -iq "^y"; then
							pkexec dnf install git -y
							git clone git://github.com/MycroftAi/Mycroft-core/ $dest
							echo 'Git Cloned to '$dest
							cd $dest
							git checkout master
							./build_host_setup_fedora.sh
							./dev_setup.sh
							abc=true
						else
							echo 'Please install git and run install again or visit https://mycroft.ai for alternate methods'
							abc=false				
							break;				
						fi
					else
						git clone git://github.com/MycroftAi/mycroft-core/ $dest
						cd $dest
						git checkout master
						echo 'Git Cloned to '$dest
						./build_host_setup_fedora.sh
						./dev_setup.sh
						abc=true;
					fi
				elif [[ ${osInfo[$f]} == "pacman" ]]; then
					if [$GIT_IS_AVAILABLE -eq 1]; then
						echo 'Git is not installed do you want to install git ?(y/n)';
						read answer
						if echo "$answer" | grep -iq "^y"; then
							sudo pacman -S git
							git clone git://github.com/MycroftAi/Mycroft-core/ $dest
							echo 'Git Cloned to '$dest 
							cd $dest
							git checkout master
							./build_host_setup_arch.sh
							./dev_setup.sh
							abc=true
						else
							echo 'Please install git and run install again or visit https://mycroft.ai for alternate methods'
							abc=false				
							break;				
						fi
					else
						git clone git://github.com/MycroftAi/mycroft-core/ $dest
						cd $dest
						echo 'Git Cloned to '$dest
						git checkout master
						./build_host_setup_arch.sh
						./dev_setup.sh
						abc=true;
					fi
				fi
			fi
		done
	if [ $abc ]; then 
		echo 'If an error occurred please visit https://github.com/MycroftAi/Mycroft-core/ or else '
		echo 'Mycroft Core Install Completed. Please set this  ---> '$dest' <--- path to Mycroft-core destination in the settings :)'
		notify-send 'Mycroft Core Install Completed. Please set this  ---> '$dest' <--- path to Mycroft-core destination in the settings'
		read a
		[ $PS1 ] && return || exit;
	else
		echo "Please visit https://mycroft.ai to install the core"
		read a
		[ $PS1 ] && return || exit;
	fi
else
    echo "Please Visit https://mycroft.ai to install the core"
    read a
    [ $PS1 ] && return || exit;
fi

