const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Gettext = imports.gettext.domain('gnome-shell-extension-mycroft');
const _ = Gettext.gettext;
const Soup = imports.gi.Soup;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Config = imports.misc.config;
const Convenience = Me.imports.convenience;

const EXTENSIONDIR = Me.dir.get_path();


const MYCROFT_SETTINGS_SCHEMA = 'org.gnome.shell.extensions.mycroft';
const MYCROFT_POSITION_IN_PANEL_KEY = 'position-in-panel';

const MYCROFT_CORE_LOCATION_KEY = 'mycroft-core-location';
const MYCROFT_IS_INSTALL_KEY = 'mycroft-is-install';
const MYCROFT_INSTALL_TYPE_KEY = 'mycroft-install-type';


const MycroftInstallType = {
  GIT: 0,
  PACKAGE: 1,
  NOT_INSTALLED: 2,
  OTHER: 3,
};

const MycroftPrefsWidget = new GObject.Class({
  Name: 'MycroftExtension.Prefs.Widget',
  GTypeName: 'MycroftExtensionPrefsWidget',
  Extends: Gtk.Box,
  _init: function (params) {
    this.parent(params);

		// Create user-agent string from uuid and (if present) the version
    this.user_agent = Me.metadata.uuid;
    if (Me.metadata.version !== undefined && Me.metadata.version.toString().trim() !== '') {
      this.user_agent += '/';
      this.user_agent += Me.metadata.version.toString();
    }
		// add trailing space, so libsoup adds its own user-agent
    this.user_agent += ' ';

    this.initWindow();

    this.refreshUI();
  },

  Window: new Gtk.Builder(),

  initWindow: function () {
    this.Window.add_from_file(EXTENSIONDIR + '/mycroft-settings.ui');
    this.mainWidget = this.Window.get_object('mycroft-pref');
    this.isInstalled = this.Window.get_object('isInstalled');
    this.inputLocation = this.Window.get_object('select-folder');
    this.selectFolderWidget = this.Window.get_object('select-folder');
    this.selectFolderOk = this.Window.get_object('ok-button');
    this.selectFolderCancel = this.Window.get_object('close-button');
    this.buttonInstall = this.Window.get_object('button-install');
    this.buttonInstallYes = this.Window.get_object('button-install-yes');
    this.buttonInstallNo = this.Window.get_object('button-install-no');
    this.labelInstall = this.Window.get_object('label-install');
    this.buttonFileChooser = this.Window.get_object('button-file-chooser');
    this.labelLocation = this.Window.get_object('label-location');
    this.installType = this.Window.get_object('combo-install-type');
    this.buttonFileChooser.set_current_folder(this.core_location);
    this.selectFolderWidget.set_current_folder(this.core_location);
    this.installType.set_active_id(this.mycroft_install_type);
    let theObjects = this.Window.get_objects();
    for (let i in theObjects) {
      let name = theObjects[i].get_name ? theObjects[i].get_name() : 'dummy';
      if (this[name] !== undefined) {
        if (theObjects[i].class_path()[1].indexOf('GtkEntry') != -1) {
          this.initEntry(theObjects[i]);
        } else if (theObjects[i].class_path()[1].indexOf('GtkComboBoxText') != -1) {
          this.initComboBox(theObjects[i]);
        } else if (theObjects[i].class_path()[1].indexOf('GtkFileChooser') != -1) {
          this.initFileChooser(theObjects[i]);
        }
        this.configWidgets.push([ theObjects[i], name ]);
      }
    }
    this.installType.connect('changed', Lang.bind(this, function () {
      this.setMycroftCore(true);
    }));
    this.installType.connect('draw', Lang.bind(this, function () {
      this.setMycroftCore();
    }));
    this.buttonInstall.connect('clicked', Lang.bind(this, function () {
      this.isInstalled.show();
    }));
    this.buttonInstallYes.connect('clicked', Lang.bind(this, function () {
      //this.openUrl();
			this.runScript();
      this.isInstalled.hide();
    }));
    this.buttonInstallNo.connect('clicked', Lang.bind(this, function () {
      this.isInstalled.hide();
    }));
    this.currentFolder;
    this.selectFolderOk.connect('clicked', Lang.bind(this, function () {
      this.setCoreFolder(this.selectFolderWidget.get_current_folder());
      this.selectFolderWidget.close();
    }));
    this.selectFolderCancel.connect('clicked', Lang.bind(this, function () {
      this.selectFolderWidget.close();
    }));
    this.buttonFileChooser.connect('button-press-event', Lang.bind(this, function () {
      this.selectFolderWidget.set_current_folder(MYCROFT_CORE_LOCATION_KEY);
      this.buttonFileChooser.set_current_folder(this.currentFolder);
    }));
  },
  openUrl: function () {
    var a = new GLib.TimeVal();
    let o = GLib.get_current_time(a);
    let url = 'https://github.com/MycroftAI/mycroft-core/';
    try {
      Gtk.show_uri(null, url, o);
    } catch (err) {
      let title = _('Can not open %s').format(url);
      log(err.message);
    }
  },
  runScript: function () {
    var e;
    try {
      let [ res, out ] = GLib.spawn_command_line_async('gnome-terminal -e ' + EXTENSIONDIR + '/shellscripts/packageInstall.sh');
    } catch (e) {
      throw e;
    }
  },
  setCoreFolder: function (v) {
    this.currentFolder = v;
    this.selectFolderWidget.set_current_folder(this.currentFolder);
    this.buttonFileChooser.set_current_folder(this.currentFolder);
    this.core_location = this.currentFolder;
  },
  getCoreFolder: function () {
    return location();
  },

  loadConfig: function () {
    this.Settings = Convenience.getSettings(MYCROFT_SETTINGS_SCHEMA);
    this.Settings.connect('changed', Lang.bind(this, function () {
      this.refreshUI();
    }));
  },
  setMycroftCore: function (fl) {
    if (fl) {
      this.mycroft_install_type = this.installType.get_active_id();
    }
    switch (this.mycroft_install_type) {
    case '0':
    case '2':
      this.mycroft_is_install = true;
      this.labelInstall.hide();
      this.buttonInstall.hide();
      this.buttonFileChooser.show();
      this.labelLocation.show();
      break;
    case '1':
      if (fl) {
        this.mycroft_install_location = '/etc/mycroft';
      }
      this.mycroft_is_install = true;
      this.labelInstall.hide();
      this.buttonInstall.hide();
      this.buttonFileChooser.hide();
      this.labelLocation.hide();
      break;
    case '3':
      this.mycroft_is_install = false;
      this.labelInstall.show();
      this.buttonInstall.show();
      this.buttonFileChooser.hide();
      this.labelLocation.hide();
      break;
    default:
      //donothing
    }
  },
  initFileChooser: function (theFileChooser) {
    let name = theFileChooser.get_name();
    theFileChooser.connect('changed', Lang.bind(this, function () {
      this[name] = this.set_current_folder('/home/$USER/Mycroft-core');
    }));
  },

  initComboBox: function (theComboBox) {
    let name = theComboBox.get_name();
    theComboBox.connect('changed', Lang.bind(this, function () {
      this[name] = arguments[0].active;
    }));
  },

	// initScale: function(theScale) {
	// 	let name = theScale.get_name();
	// 	theScale.set_value(this[name]);
	// 	this[name + 'Timeout'] = undefined;
	// 	theScale.connect("value-changed", Lang.bind(this, function(slider) {
	// 		if (this[name + 'Timeout'] !== undefined)
	// 			Mainloop.source_remove(this[name + 'Timeout']);
	// 		this[name + 'Timeout'] = Mainloop.timeout_add(250, Lang.bind(this, function() {
	// 			this[name] = slider.get_value();
	// 			return false;
	// 		}));
	// 	}));

	// },

  refreshUI: function () {
    this.mainWidget = this.Window.get_object('mycroft-pref');
    let config = this.configWidgets;
    for (let i in config) {
      if (config[i][0].active != this[config[i][1]]) {
        config[i][0].active = this[config[i][1]];
      }
    }
  },

  configWidgets: [],

  get position_in_panel() {
    if (!this.Settings) {
      this.loadConfig();
    }
    return this.Settings.get_enum(MYCROFT_POSITION_IN_PANEL_KEY);
  },

  set position_in_panel(v) {
    if (!this.Settings) {
      this.loadConfig();
    }
    this.Settings.set_enum(MYCROFT_POSITION_IN_PANEL_KEY, v);
  },

	// get menu_alignment() {
	// 	if (!this.Settings)
	// 		this.loadConfig();
	// 	return this.Settings.get_double(MYCROFT_MENU_ALIGNMENT_KEY);
	// },

	// set menu_alignment(v) {
	// 	if (!this.Settings)
	// 		this.loadConfig();
	// 	return this.Settings.set_double(MYCROFT_MENU_ALIGNMENT_KEY, v);
	// },
  get core_location() {
    if (!this.Settings) {
      this.loadConfig();
    }
    return this.Settings.get_string(MYCROFT_CORE_LOCATION_KEY);
  },
  set core_location(v) {
    if (!this.Settings) {
      this.loadConfig();
    }
    return this.Settings.set_string(MYCROFT_CORE_LOCATION_KEY, v);
  },
	// get pressure_unit() {
	// 	if (!this.Settings)
	// 		this.loadConfig();
	// 	return this.Settings.get_enum(MYCROFT_PRESSURE_UNIT_KEY);
	// },

	// set pressure_unit(v) {
	// 	if (!this.Settings)
	// 		this.loadConfig();
	// 	this.Settings.set_enum(OPENWEATHER_PRESSURE_UNIT_KEY, v);
	// }
  get mycroft_install_type() {
    if (!this.Settings) {
      this.loadConfig();
    }
    return this.Settings.get_string(MYCROFT_INSTALL_TYPE_KEY);
  },
  set mycroft_install_type(v) {
    if (!this.Settings) {
      this.loadConfig();
    }
    return this.Settings.set_string(MYCROFT_INSTALL_TYPE_KEY, v);
  },
  get mycroft_is_install() {
    if (!this.Settings) {
      this.loadConfig();
    }
    return this.Settings.get_boolean(MYCROFT_IS_INSTALL_KEY);
  },
  set mycroft_is_install(v) {
    if (!this.Settings) {
      this.loadConfig();
    }
    return this.Settings.set_boolean(MYCROFT_IS_INSTALL_KEY, v);
  },

});
// var mycRunner = {
// 	_spawn_async: function ( cmd, e ) {
// 		try {
//             GLib.spawn_command_line_async( cmd, e );
//         } catch ( e ) {
//             throw e;
//           }
//  	    },

// 	start : function () {
// 	        this._spawn_async(mycConfig.start, null);
// 	    },

// 	install : function () {
// 		this._spawn_async(mycConfig.install, null);
// 	    },

// 	connect : function () {
// 		this._spawn_async(mycConfig.connect, null);
// 	    },

//    	stop : function() {
//    	     this._spawn_async(mycConfig.stop, null);
//     	    }

// 	};

function init() {
  Convenience.initTranslations('gnome-shell-extension-mycroft');
}

function buildPrefsWidget() {
  let prefs = new MycroftPrefsWidget();
  let widget = prefs.mainWidget;
  widget.show_all();
  return widget;
}

function printAllProperties(obj) {
  var propValue;
  for (var propName in obj) {
    propValue = obj[propName];

    log(propName, propValue);
  }
}
