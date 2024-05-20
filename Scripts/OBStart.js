var app = angular.module("OnboardBookingApp", ['checklist-model', 'cgBusy', 'ngCookies']);


app.directive('ngReallyClick', [function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            element.bind('click', function () {
                var message = attrs.ngReallyMessage;
                if (message && confirm(message)) {
                    scope.$apply(attrs.ngReallyClick);
                }
            });
        }
    }
}])

    .filter('guestfilter', function () {
        return function (items, searchtext) {
            var filtered = [];
            //here you will have your desired input


            angular.forEach(items, function (item) {

                var regex = new RegExp(searchtext, 'gi');
                if (item.unino.match(regex) || item.FullName.match(regex)) {
                    filtered.push(item);

                }


            });




            return filtered;
        };

    })

app.controller("OnboardBookingCtrl", ['$scope', '$http', 'orderByFilter', '$timeout', '$q', '$filter', 'OnboardBooking_CONFIG', '$window', '$cookies', function ($scope, $http, orderBy, $timeout, $q, $filter, OnboardBooking_CONFIG, $window, $cookies) {



    var basePath = OnboardBooking_CONFIG.basePath;
    var pscBasePath = OnboardBooking_CONFIG.pscBasePath;
    var InternalbasePath = OnboardBooking_CONFIG.InternalbasePath;
    var referrerComp = OnboardBooking_CONFIG.referrer;
    var testreferrerComp = OnboardBooking_CONFIG.testreferrer;
    var clientKey = OnboardBooking_CONFIG.clientKey;
    var apiLoginID = OnboardBooking_CONFIG.apiLoginID;

    var ADGroup = OnboardBooking_CONFIG.ADGroup;
    var OnboardBookingLink = OnboardBooking_CONFIG.OnboardBookingLink;

    $scope.maintenanceFlag = OnboardBooking_CONFIG.maintenanceFlag;
    $scope.maintenanceMsg = OnboardBooking_CONFIG.maintenanceMsg;

    $scope.devip = OnboardBooking_CONFIG.devip;
    $scope.officeip = OnboardBooking_CONFIG.officeip;

    $scope.flag = false;

    $scope.validuser = false;
    $scope.IDtried = false;

    $scope.copyrightdate = new Date().getFullYear();
    $scope.checked = 0;

    $scope.isIE = function () {

        if (navigator.userAgent.indexOf('MSIE') !== -1 || navigator.appVersion.indexOf('Trident/') > 0) {
            $scope.isIE = true;

        }
        else
            $scope.isIEreturn = false;


    }
    function loadScript(url) {
        var head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;
        head.appendChild(script);
    }


    function urlParam(name) {
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results == null) {
            return undefined;
        }
        else {
            return decodeURI(results[1]) || 0;
        }
    }



    $scope.sortBy = function (propertyName) {
        $scope.reverse = (propertyName !== null && $scope.propertyName === propertyName)
            ? !$scope.reverse : false;
        $scope.propertyName = propertyName;
        $scope.ShipPersonnels = orderBy($scope.ShipPersonnels, $scope.propertyName, $scope.reverse);
    };

    $scope.NeedAuthentication = function () {
        // $scope.getUserIP();
        var OBBID = $cookies.get('OBBID');
        var lastlogin = $cookies.get('OBBLastLogin');
        $scope.ADID = OBBID;
        if (OBBID == undefined || lastlogin == undefined) {
            $scope.validuser = false;
            $scope.errorcode = 0;
            $scope.NeedAuthentication = true;
            $cookies.remove('OBBID');
            $cookies.remove('OBBLastLogin');
        }
        else {


            $scope.method = 'GET';
            $scope.url = 'getIP.php';


            $http({ method: $scope.method, url: $scope.url }).
                then(function (response) {
                    $scope.status = response.status;
                    $scope.ipAddress = response.data;
                    $scope.currentuser = {};
                    //get login from cookie
                    $scope.currentuser.ID = OBBID;
                    $scope.currentuser.PW = undefined;
                    $scope.currentuser.Valid = false;
                    $scope.currentuser.ipAddress = $scope.ipAddress;
                    $scope.currentuser.errorcode = 0;
                    //get last login from cookie
                    $scope.currentuser.lastlogin = new Date(lastlogin);

                    $scope.SyncPromise = $http({
                        method: "post",
                        url: InternalbasePath + "PIFViewer/NeedAuthentication",
                        datatype: "json",
                        data: JSON.stringify($scope.currentuser)
                    }).then(function (response) {
                        var currentuserValidated = response.data;
                        $scope.validuser = currentuserValidated.Valid;
                        $scope.errorcode = currentuserValidated.errorcode;
                        $scope.NeedAuthentication = currentuserValidated.NeedAuthentication;
                        if (!$scope.NeedAuthentication)
                            $scope.GetAllShips();

                    }, function () {
                        alert("Error Occured");
                    })
                }, function (response) {
                    $scope.ipAddress = response.data || 'Request failed';
                    $scope.status = response.status;
                    alert("Error Occured");
                });
        }


    }
    $scope.validateUser = function () {
        // $scope.getUserIP();
        $scope.method = 'GET';
        $scope.url = 'getIP.php';

        $scope.validuser = true;
        if ($scope.validuser) {
            $scope.GetAllShips();
            $scope.NeedAuthentication = false;
            //create cookies
            var now = new Date(),
                // this will set the expiration to 12 years
                expiresdate = new Date(now.getFullYear() + 12, now.getMonth(), now.getDate());
            $cookies.put('OBBID', $scope.loginid, { expires: expiresdate });
            $cookies.put('OBBLastLogin', new Date(), { expires: expiresdate });
        }



        // $scope.ADID = $scope.loginid;
        // $http({ method: $scope.method, url: $scope.url }).
        //     then(function (response) {
        //         $scope.params = {};
        //         $scope.status = response.status;
        //         $scope.ipAddress = response.data;
        //         $scope.currentuser = {};
        //         $scope.currentuser.ID = $scope.loginid;
        //         $scope.currentuser.PW = $scope.loginpw;
        //         $scope.currentuser.Valid = false;
        //         $scope.currentuser.ipAddress = $scope.ipAddress;
        //         $scope.currentuser.errorcode = 0;
        //         $scope.NeedAuthentication = true;
        //         $scope.params.groupname = ADGroup;
        //         $scope.params.currentuser = $scope.currentuser;

        //         $scope.SyncPromise = $http({
        //             method: "post",
        //             //url: basePath + "PIFViewer/Check_Authorization",
        //             url: InternalbasePath + "PIFViewer/Check_AuthorizationAuthentication",
        //             datatype: "json",
        //             //data: JSON.stringify($scope.currentuser)
        //             data: JSON.stringify($scope.params)
        //         }).then(function (response) {
        //             var currentuserValidated = response.data;
        //             $scope.validuser = currentuserValidated.Valid;
        //             $scope.errorcode = currentuserValidated.errorcode;

        //             if ($scope.validuser) {
        //                 $scope.GetAllShips();
        //                 $scope.NeedAuthentication = false;
        //                 //create cookies
        //                 var now = new Date(),
        //                     // this will set the expiration to 12 years
        //                     expiresdate = new Date(now.getFullYear() + 12, now.getMonth(), now.getDate());
        //                 $cookies.put('OBBID', $scope.loginid, { expires: expiresdate });
        //                 $cookies.put('OBBLastLogin', new Date(), { expires: expiresdate });
        //             }
        //             else {
        //                 $scope.IDtried = true;
        //                 $scope.NeedAuthentication = true;
        //             }
        //         }, function () {
        //             alert("Error Occured");
        //         })
        //     }, function (response) {
        //         $scope.ipAddress = response.data || 'Request failed';
        //         $scope.status = response.status;
        //         alert("Error Occured");
        //     });


    }

    $scope.GetAllShips = function () {
        params = {};
        $scope.Ships = [];
        // ACL Ship Names
        $scope.SyncPromise = $http({
            method: "post",
            datatype: "json",
            data:{},
            url: basePath + "GetAllShipNames"
        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {
                    if (Response.GetAllShipNames.Result.Status == "A") {
                        //$scope.Ships = Response.GetAllShipNames.FacilityList;
                        Response.GetAllShipNames.FacilityList.forEach(x => {
                            $scope.Ships.push(x);
                        });
                         // Sort by name
                         $scope.Ships.sort((a,b) => (a.Name > b.Name) ? 1 : ((b.Name > a.Name) ? -1 : 0));
                    }
                    if (Response.GetAllShipNames.Result.Status == "U") {
                        alert("Unuathorized for GetDepartureDatesforShip");
                    }
                }
            }
            else
                alert(response.statusText);

        }, function () {
            alert("Error Occured in Get Ships");
        });
        // PSC ships
        $scope.SyncPromise = $http({
            method: "post",
            datatype: "json",
            data: {},
            url: pscBasePath + "GetAllShipNames"
        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {
                    if (Response.GetAllShipNames.Result.Status == "A") {
                        //$scope.Ships = Response.GetAllShipNames.FacilityList;
                        Response.GetAllShipNames.FacilityList.forEach(x => {
                            x.Name = $scope.toTitleCase(x.Name);
                            $scope.Ships.push(x);
                        });
                        // Sort by name
                        $scope.Ships.sort((a,b) => (a.Name > b.Name) ? 1 : ((b.Name > a.Name) ? -1 : 0));
                    }
                    if (Response.GetAllShipNames.Result.Status == "U") {
                        alert("Unuathorized for GetDepartureDatesforShip");
                    }
                }
            }
            else
                alert(response.statusText);

        }, function () {
            alert("Error Occured in Get Ships");
        });

    }


    $scope.toTitleCase = function(str) {
        return str.replace(
          /\w\S*/g,
          function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
          }
        );
      }

    $scope.GetAllCurrentPassengers = function () {
        params = {};
        params.ShipCode = $scope.selShipCode;
        // ACL or PSC?
        var shipName = $scope.Ships.find(x => x.Code == params.ShipCode).Name;
        passengersUrl = shipName == 'undefined' || !shipName.toLowerCase().startsWith('pearl') ? basePath : pscBasePath;
        $scope.SyncPromise = $http({
            method: "post",
            datatype: "json",
            data: JSON.stringify(params),

            url: passengersUrl + "GetPassengersOnCurrentCruise"

        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {

                    if (Response.GetPassengersOnCurrentCruise.Result.Status == "A") {
                        tempPAXList = Response.GetPassengersOnCurrentCruise.PassengerList;
                        //add placeholder for checkbox
                        angular.forEach(tempPAXList, function (PAX)
                        //   tempPAXList.forEach(PAX)
                        {
                            PAX.RebookSelected = 0;
                        })
                        $scope.PAXList = tempPAXList;
                        $scope.addnewdiv = true;

                    }
                    if (Response.GetPassengersOnCurrentCruise.Result.Status == "U") {
                        alert("Unuathorized for GetPassengersOnCurrentCruise");
                    }
                }
            }
            else
                alert(response.statusText);

        }, function () {
            alert("Error Occured in get passengers");
        })



    }
    $scope.clear = function () {
        //Clear the window
        $scope.PAXList.forEach(function (pax) {
            pax.RebookSelected = false;
            $scope.searchText = undefined;
            $scope.checked = 0;
        })

    }

    $scope.clearchecks = function () {
        //Clear the window
        $scope.PAXList.forEach(function (pax) {
            pax.RebookSelected = false;

        })

    }

    $scope.checkChanged = function (item) {
        if (item.RebookSelected)
            $scope.checked++;
        else
            $scope.checked--;
    }
    $scope.Rebook = function () {
        paxselected = [];

        //Launch the rebooking process
        $scope.PAXList.forEach(function (pax) {
            if (pax.RebookSelected) {
                //alert("Pax Selected" + pax.folUid);
                paxselected.push(pax);
            }
        })

        if (paxselected.length == 2)
            // STU - DEV
            window.open(OnboardBookingLink + "/OBSelect.html?CurrentCruiseNum=" + paxselected[0].CruiseCode + "&guest1nm=" + paxselected[0].FullName + "&guest2nm=" + paxselected[1].FullName + "&bookingnum=" + paxselected[0].BookingCode + "&folio1=" + paxselected[0].FolioId + "&folio2=" + paxselected[1].FolioId, "_blank")
            //window.open(OnboardBookingLink + "/OnboardBooking/OBSelect?CurrentCruiseNum=" + paxselected[0].CruiseCode + "&guest1nm=" + paxselected[0].FullName + "&guest2nm=" + paxselected[1].FullName + "&bookingnum=" + paxselected[0].BookingCode + "&folio1=" + paxselected[0].FolioId + "&folio2=" + paxselected[1].FolioId, "_blank")
        else
        // STU - DEV
        window.open(OnboardBookingLink + "/OBSelect.html?CurrentCruiseNum=" + paxselected[0].CruiseCode + "&guest1nm=" + paxselected[0].FullName + "&bookingnum=" + paxselected[0].BookingCode + "&folio1=" + paxselected[0].FolioId, "_blank")
            //window.open(OnboardBookingLink + "/OnboardBooking/OBSelect?CurrentCruiseNum=" + paxselected[0].CruiseCode + "&guest1nm=" + paxselected[0].FullName + "&bookingnum=" + paxselected[0].BookingCode + "&folio1=" + paxselected[0].FolioId, "_blank")


    }

    $scope.GetCurrentCruiseBookings = function () {

        //get current cruise from the new web service

        params = {};
        params.ShipCode = $scope.selShipCode;
        $scope.SyncPromise = $http({
            method: "post",
            datatype: "application/json",
            data: JSON.stringify(params),

            url: aclBasePath + "GetCurrentCruiseForShip"

        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {

                    if (Response.GetCurrentCruiseForShip.Result.Status == "A") {
                        $scope.CruiseNum = Response.GetCurrentCruiseForShip.CruiseCode;
                        location.href = OnboardBookingLink + "/OnboardBooking/OBList?CruiseNum=" + $scope.CruiseNum;

                    }
                    if (Response.GetCurrentCruiseForShip.Result.Status == "U") {
                        alert("Unuathorized for GetCurrentCruiseForShip");
                    }
                }
            }
            else
                alert(response.statusText);

        }, function () {
            alert("Error Occured");
        })



    }
}])  