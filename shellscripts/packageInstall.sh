#!/bin/bash

echo 'Install Script for Mycroft-core:';
echo 'Are you sure you want to continue to installing Mycroft-core from a package?';

echo -n "Is this a good question (y/n)? "
read answer
if echo "$answer" | grep -iq "^y"; then
    echo -n 'Yes';
	read abc;
else
    echo No
fi
echo $abc;
