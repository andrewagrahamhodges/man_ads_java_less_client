   //alert(process.platform);
   child_process = require('child_process')
   window.$ = window.jQuery = require('jquery');
   $("#connect").click(function() {
       login = $("#login").val()
       pwd = $("#pwd").val()
       sm = $("#sm").val()

       $.ajax({
           url: sm + "/ovd/proxy.php",
           type: "POST",
           headers: {
               "x-ovd-service": "start"
           },
           data: '<session mode="desktop"><user login="' + login + '" password="' + pwd + '"/></session>',
           dataType: "text",
           success: function(response) {

               var xml = response,
                   xmlDoc = $.parseXML(xml),
                   $xml = $(xmlDoc);

               $.each($xml.find('server'), function() {
                   login = $(this).attr("login");
                   fqdn = $(this).attr("fqdn");
                   port = $(this).attr("port");
                   password = $(this).attr("password");
               });
               if (port == null) {
                   port = 3389
               };
               var executablePath;
               if (process.platform == "linux") {
                   var child = require('child_process').exec;
                   executablePath = "xfreerdp /v:" + fqdn + ":" + port + " /u:" + login + " /p:'" + password + "' /sec:rdp /drive:home,$HOME /printer /jpeg /parent-window:`xwininfo -name 'MAN OVD Client' | grep 'Window id' | cut -d' ' -f4` /size:`xwininfo -name 'MAN OVD Client' | grep 'Width' | tr -s ' '|cut -d' ' -f3`x`xwininfo -name 'MAN OVD Client' | grep 'Height' | tr -s ' '|cut -d' ' -f3`";
                   setTimeout(() => child(executablePath), 5000);
               } else if (process.platform == "darwin") {
                   var child = require('child_process').execFile;
                   executablePath = "/usr/bin/open";
                   opt = "rdp://" + login + ":" + password + "@" + fqdn + ":" + port + "?forwardDisks###yes\&forwardPrinters###yes";
                   options = [opt];
                   setTimeout(() => child(executablePath, options), 5000);
               }
               //else if (process.platform == "win32"){
               else {
                   var child = require('child_process').exec;
                   executablePath = "%cd%\\resources\\app\\rdp.exe /v:" + fqdn + ":" + port + " /u:" + login + " /p:" + password + " /printers /drives /max";
                   setTimeout(() => child(executablePath), 5000);
                   //alert(executablePath);
               }

           },
           error: function(data) {
               alert("failure");
           },
       })
   });
