/*jshint esversion: 6 */
child = require('child_process').exec;
moment = require('moment');

request = require("request-with-cookies");
window.$ = window.jQuery = require('jquery');

notifier = require('node-notifier');

var ready = false;

$.fn.extend({
    animateCss: function (animationName) {
        var animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
        this.addClass('animated ' + animationName).one(animationEnd, function() {
            $(this).removeClass('animated ' + animationName);
        });
        return this;
    }
});

function notify(icon, title, msj) {
    notifier.notify({
    'icon': icon,
    'title': title,
    'message': msj
});
}

function show_login(){
    $('#inner_box').show();
    $('#progress').hide();
}

$(".logo").click(function() {
    //$(this).animateCss('wobble');
    window.open("https://manconsulting.co.uk","MAN Consulting", "width=1280,height=600")
});


function wait_for_ready_state()
{
        sm = $("#sm").val();

        options = {
            method: 'POST',
            headers: {'x-ovd-service': 'session_status', 'Cookie': 'PHPSESSID='+$("#login").val()}
        };

        client = request.createClient(options);
        client(sm+"/ovd/proxy.php",function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(response.body);
                setTimeout(function() {
                xmlDoc = $.parseXML(response.body);
                $xml = $(xmlDoc);
                try {
                $.each($xml.find('session'), function() {
                    status = $(this).attr("status");
                });
                }
                catch(err)
                {
                    return "None";
                }
                console.log(status);
                return(status);
                }, 2000);
            }
            else {
                return "None";
            }
        });
}


function set_status(status, init=false) {
    if (init != false) {
        $(".status").empty();
    }
    now = moment().format('YYYY-MM-DD hh:mm:ss');
    height = $(".status")[0].scrollHeight;
    $(".status").html("<div class=\"col-xs-12\">"+status+"</div>");
    $(".status").scrollTop(height);

}

function check_ovd_status(ovd_data) {
    	return new Promise (function (res,rej) {
        login = $("#login").val();
        pwd = $("#pwd").val();
        sm = $("#sm").val();

        options = {
            method: 'POST',
            headers: {'x-ovd-service': 'session_status', 'Cookie': 'PHPSESSID='+$("#login").val()}
        };

        client = request.createClient(options);
        client(sm+"/ovd/proxy.php",function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(response.body);
                setTimeout(function() {
                xmlDoc = $.parseXML(response.body);
                $xml = $(xmlDoc);
                try {
                $.each($xml.find('session'), function() {
                    status = $(this).attr("status");
                });
                set_status("Preparing session settings...");
                }
                catch(err)
                {
                    status = "None";
                }
                if(status == "logged")
                {
                    console.log(status);
                    $('#inner_box').show();
                    $('#progress').hide();
                }
                else if(status == "init")
                {
                    console.log(status);
                    check_ovd_status(ovd_data);
                }
                else if (status == "ready") {
                    console.log(response.body);

                    validate_xml_response(ovd_data)
                    .then(xml => get_ovd_credentials(xml))
                    .then(params => create_os_command(params))
                    .then(command => run_rdp(command))
                    .then(check_ovd_status(ovd_data))
                   .catch(rejection => {
			    notify(__dirname+"/warning.png","Please contact your OVD Session Manager", "Reason: "+rejection);
			    show_login();
		            });
                }
                else {
                    console.log(status);
                    rej("Failed to connect");
                }
                }, 2000);
            }
            else {
                $("#connect").animateCss('wobble');
		show_login();
                rej("Unable to connect to OVD server");
		
            }
        });
});
}

function start_session() {
    	return new Promise (function (res,rej) {
        login = $("#login").val();
        pwd = $("#pwd").val();
        sm = $("#sm").val();
             set_status("Starting OVD Session...");
        options = {
            method: 'POST',
            headers: {'x-ovd-service': 'start', 'Cookie': 'PHPSESSID='+$("#login").val()},
            body: '<session mode="desktop"><user login="' + login + '" password="' + pwd + '"/></session>'
        };

        client = request.createClient(options);
        client(sm+"/ovd/proxy.php",function (error, response, body) {
        if (!error && response.statusCode == 200) {
            notify(__dirname+"/conecting.png","Preparing session", "Please wait...");
            res(response.body);
        }
        else {
                $("#connect").animateCss('wobble');
		show_login();
                rej("Unable to connect to OVD server");
        }
        });
});
}

function validate_xml_response(xml) {
    return new Promise (function (res,rej) {
     set_status("Validate reponse");
    try {
        xmlDoc = $.parseXML(xml);
        $xml = $(xmlDoc);
        $.each($xml.find('response'), function() {
            response = $(this).attr("code");
        });
        if(response != undefined && response != 'ReferenceError: response is not defined')
        {
            $("#connect").animateCss('wobble');
            rej(response);
        }
        }
        catch(err)
        {
            res(xml);
        }
    });
}

function get_ovd_credentials(xml) {
    return new Promise (function (res,rej) {
    try {
        xmlDoc = $.parseXML(xml);
        $xml = $(xmlDoc);
        params = {};
         $.each($xml.find('server'), function() {
           params.login = $(this).attr("login");
           params.fqdn = $(this).attr("fqdn");
           try
           {
               params.port = $(this).attr("port");
           }
           catch(err) {
               console.log("No hay puerto");
           }
           params.password = $(this).attr("password");
         });
           if(params.port == null || params.port == undefined || params.port == "undefined")
           {
               params.port = 3389;
           }
        res(params);
    }
    catch(err)
    {
        $("#connect").animateCss('wobble');
	show_login();
        rej("Unable to Login, OVD Server provides wrong Credential Data, "+err);
    }
});

}

function create_os_command(params) {
    return new Promise (function (res,rej) {
    try {
        os_rdp_exe = {
            linux: "xfreerdp /v:" + params.fqdn + ":" + params.port + " /u:" + params.login + " /p:'" + params.password + "' /sec:rdp /drive:home,$HOME /printer +clipboard /jpeg /parent-window:`xwininfo -name 'MAN OVD Client' | grep 'Window id' | cut -d' ' -f4` /size:`xwininfo -name 'MAN OVD Client' | grep 'Width' | tr -s ' '|cut -d' ' -f3`x`xwininfo -name 'MAN OVD Client' | grep 'Height' | tr -s ' '|cut -d' ' -f3`",
            win32: "resources\\app\\rdp.exe /v:" + params.fqdn + ":" + params.port + " /u:" + params.login + " /p:" + params.password + " /printers /drives /max",
            darwin: "open "+__dirname+"/MacFreeRDP/MacFreeRDP.app --args /f /v:" + params.fqdn + ":" + params.port + " /u:" + params.login + " /p:'" + params.password + "' /sec:tls /cert-ignore  /drive:home,$HOME /printer +clipboard"
        };
        res(os_rdp_exe[process.platform]);
    }
    catch(err) {
        rej(err);
    }

    });
}

function run_rdp(command){
    return new Promise (function (res,rej) {
	if (ready == true) {
            try {
                set_status("Starting Session...");
                child(command);
                console.log(command);
                console.log("Corriendo RDP");
                res('Done');
            }
            catch(err)
            {
                rej(err);
            }
	}
	ready = false;
    });

}

$("#connect").click(function() {
     ready = true;
     set_status("Connecting to OVD...", true);
     document.cookie = "PHPSESSID="+$("#login").val();
     notify(__dirname+"/conecting.png","Conecting to your OVD Session Manager", "Please wait...");
     $('#inner_box').hide();
     $('#progress').show();
     start_session()
     .then(ovd_data => check_ovd_status(ovd_data))
    .catch(rejection => { 
	     notify(__dirname+"/warning.png","Please contact your OVD Session Manager", "Reason: "+rejection);
	     show_login();
	      });
});
