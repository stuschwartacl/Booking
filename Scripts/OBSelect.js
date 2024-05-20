var app = angular.module("OnboardBookingApp", ['checklist-model', 'cgBusy', 'ngMaterial']);



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
app.controller("OnboardBookingCtrl", ['$scope', '$http', 'orderByFilter', '$timeout', '$q', '$filter', 'OnboardBooking_CONFIG', '$window', function ($scope, $http, orderBy, $timeout, $q, $filter, OnboardBooking_CONFIG, $window) {

    var internalbasePath = OnboardBooking_CONFIG.InternalbasePath;
    var basePath = OnboardBooking_CONFIG.basePath;
    var pscBasePath = OnboardBooking_CONFIG.pscBasePath;
    var referrerComp = OnboardBooking_CONFIG.referrer;
    var testreferrerComp = OnboardBooking_CONFIG.testreferrer;
    var webreferrerComp = OnboardBooking_CONFIG.referrerWEB;
    var clientKey = OnboardBooking_CONFIG.clientKey;
    var apiLoginID = OnboardBooking_CONFIG.apiLoginID;
    $scope.devip = OnboardBooking_CONFIG.devip;
    $scope.officeip = OnboardBooking_CONFIG.officeip;
    var defaultagentid = OnboardBooking_CONFIG.defaultagentid;

    $scope.maintenanceFlag = OnboardBooking_CONFIG.maintenanceFlag;
    $scope.maintenanceMsg = OnboardBooking_CONFIG.maintenanceMsg;

    $scope.preCruiseOptSelected = false;
    $scope.preoptselectedmodel = undefined;
    $scope.changeselection = false;
    $scope.receiptPath = OnboardBooking_CONFIG.ReceiptPath;

    $scope.copyrightdate = new Date().getFullYear();

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

    $scope.GetAllData = function () {
        //base64 encoded booking code
        //hash
        // will return the host name and port
        var host = window.location.host;
        if (host.includes("traveldocuments.americancruiselines.com"))
            loadScript('https://js.authorize.net/v1/Accept.js');
        else
            loadScript('https://jstest.authorize.net/v1/Accept.js');

        $scope.invalidbooking = "False";
        $scope.BookingSubmitted = "False";
        $scope.takepayment = false;
        const queryString = window.location.search;
        $scope.selfolio = undefined;
        //this code does not work with IE  - replaced with urlParam function above
        //const urlParams = new URLSearchParams(queryString);
        //const hash = urlParams.get('hash');

        //page must come from shorex only or from the list page
        var referrer = document.referrer;
        $scope.referrer = referrer;
        // var URLReferrer = document.referrer.substr(0, referrer.indexOf('?'));
        //$scope.URLReferrer = URLReferrer;
        //get user IP address
        $http({
            method: "get",
            datatype: "application/json",
            //data: JSON.stringify(params),
            url: "https://ipinfo.io/json"

        }).then(function (response) {
            Response = response.data;
            $scope.ipaddress = Response.ip;
            var selfreferrer = window.location.protocol + "//" + window.location.hostname;
            if (referrer != referrerComp && !referrer.includes(selfreferrer) && referrer != testreferrerComp && $scope.ipaddress != $scope.devip && $scope.ipaddress != $scope.officeip && referrer != webreferrerComp) {
                $scope.invalidbooking = "True";
            }
            else {
                $scope.guest1name = urlParam('guest1nm');
                $scope.guest2name = urlParam('guest2nm');
                $scope.currbooking = urlParam('bookingnum');
                if ($scope.currbooking == undefined)
                    $scope.currbookingId = urlParam('bookingid');
                if ($scope.bookingId == undefined) {
                    $scope.bookingId = urlParam('bookingid');

                }

                // If this is a PSC customer - get PSC Folio and attempt to find/create ACL Folio
                if (urlParam('CurrentCruiseNum').toLowerCase().startsWith('psc')) {
                    $scope.FindFolioInPSC($scope.guest1name, 1);
                    if ($scope.guest2name) {
                        $scope.FindFolioInPSC($scope.guest2name, 2);
                    }
                }
                else {
                    $scope.folio1 = urlParam('folio1');
                    $scope.folio2 = urlParam('folio2');

                    if ($scope.folio2 == undefined)
                        $scope.numfolios = 1;
                    else
                        $scope.numfolios = 2;

                    $scope.GatherDetails();


                }


            }
        }, function () {
            alert("Error Occurred");
        })
    };

    $scope.AddFolio = function (folioInfo) {
        folioParams = {
            "firstName": folioInfo['Forename'] || '',
            "lastName": folioInfo['Surname'] || '',
            "address": folioInfo['Street'] || '',
            "city": folioInfo['City'] || '',
            "state": folioInfo['Province'] || '',
            "zip": folioInfo['PostalCode'] || '',
            "phone": folioInfo["Phone1"] || '',
            "email": folioInfo["Email"] || '',
            "EnqueryCode": folioInfo["EnquirySource"] || ''
        }
        $scope.SyncPromise = $http({
            method: "post",
            url: basePath + "AddFolio",
            datatype: "application/json",
            data: JSON.stringify(folioParams)
        }).then(function (response) {
            Response = response.data;
            if (Response.AddFolio.Result.Status == "A") {
                // Success - find folio in ACL
                $scope.FindFolioInACL(
                    folioInfo['Forename'] || '',
                    folioInfo['Surname'] || '',
                    folioInfo['PostalCode'] || '',
                    folioInfo["Email"] || '',
                )
            }
        });
    }

    $scope.FindFolioInPSC = function (guestname, guestNumber) {
        $scope.guestNumber = guestNumber
        // Find folio based on first/last name
        pscParams = {
            "firstName": guestname.split(' ')[0],
            "lastName": guestname.split(' ')[1]
        }
        $scope.SyncPromise = $http({
            method: "post",
            url: pscBasePath + "SearchForFolio",
            datatype: "application/json",
            data: JSON.stringify(pscParams)
        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {
                    if (Response.SearchForFolio.Result.Status == "A") {
                        // Get firstname, lastname, zip and email for accurate ACL lookup
                        foundPscFolio = Response.SearchForFolio.FolioList[0];
                        if (foundPscFolio != 'undefined') {
                            $scope.FindFolioInACL(
                                foundPscFolio['Forename'] || '',
                                foundPscFolio['Surname'] || '',
                                foundPscFolio['PostalCode'].split('-')[0] || '',
                                foundPscFolio['Email'] || ''
                            )
                        }
                    }
                    if (Response.SearchForFolio.Result.Status == "U") {
                        alert("Unuathorized for Stu");
                    }
                }
            }
            else
                alert(response.statusText);
        }, function () {
            alert("Error Occurred - stu");
        });

    }

    $scope.FindFolioInACL = function (firstName, lastName, zip, email) {
        aclParams = {
            "firstName": firstName,
            "lastName": lastName,
            "zip": zip,
            "email": email
        };
        // Perform ACL lookup
        $scope.SyncPromise = $http({
            method: "post",
            url: basePath + "SearchForFolio",
            datatype: "application/json",
            data: JSON.stringify(aclParams)
        }).then(function (aclResponse) {
            if (aclResponse.data !== "") {
                Response = aclResponse.data;
                if (Response.SearchForFolio.Result.Status == "A") {
                    if (Response.SearchForFolio.FolioList.length == 0) {
                        // No ACL Folios found for this PSC Customer - Create one
                        if(email == ''){
                            $scope.AddFolio(foundPscFolio);
                        } else {
                            $scope.FindFolioInACL(firstName, lastName, zip, '')
                        }
                    }
                    else if (Response.SearchForFolio.FolioList.length == 1) {
                        // One ACL Folio - use it
                        switch ($scope.guestNumber) {
                            case 1:
                                $scope.folio1 = Response.SearchForFolio.FolioList[0];
                            case 2:
                                $scope.folio2 = Response.SearchForFolio.FolioList[0];
                        }
                        if ($scope.folio2 == undefined)
                            $scope.numfolios = 1;
                        else
                            $scope.numfolios = 2;
                        // Folios set or created - gather details
                        $scope.GatherDetails()
                    }
                    else {
                        // Greater than 1 - look for the oldest
                        earliestModifyDate = Response.SearchForFolio.FolioList.reduce(function (res, obj) {
                            return obj.ModifyDate < res.ModifyDate ? obj : res;
                        })
                        if (earliestModifyDate != 'undefined') {
                            switch ($scope.guestNumber) {
                                case 1:
                                    $scope.folio1 = earliestModifyDate;
                                case 2:
                                    $scope.folio2 = earliestModifyDate;
                            }
                        }
                        if ($scope.folio2 == undefined)
                            $scope.numfolios = 1;
                        else
                            $scope.numfolios = 2;
                        // Folios set or created - gather details
                        $scope.GatherDetails()
                    }


                }
            } else if (Response.SearchForFolio.Result.Status == "U") {
                alert("Unuathorized for Stu 2");
            }
        });
    }

    $scope.GatherDetails = function () {
        // Populate values after async
        $scope.CurrentCruiseNum = urlParam('CurrentCruiseNum');

        //get these values from the list of tentative bookings

        $scope.ShipSel = urlParam('FacilityID');

        if ($scope.ShipSel != undefined) {
            $scope.ShipSel = parseInt($scope.ShipSel);
            $scope.GetAllCruiseTypes();
            $scope.CruiseType = "ALL  ";
            $scope.GetShipsForCruiseType();
            $scope.t2Booking = true;
            $scope.t2BookingInit = true;
            $scope.GetDeparturesForShip();
        }
        else {
            $scope.t2Booking = false;
            $scope.t2BookingInit = false;
        }
        $scope.EventID = urlParam('EventID');
        if ($scope.EventID != undefined) {
            $scope.GetCategoriesForCruise();
            $scope.getOptions();

        }
        $scope.selCategory = parseInt(urlParam('CategoryID'));
        $scope.selRoom = parseInt(urlParam('UnitID'));

        $scope.obbuid = urlParam('obbuid');
        $scope.tentativeBookingID = urlParam('obbuid');

        $scope.CurrShip = $scope.CurrentCruiseNum.substr(0, 3);
        $scope.GetOBMarketingType();
        if ($scope.guest1name == undefined || ($scope.currbooking == undefined && $scope.currbookingId == undefined) || $scope.folio1 == undefined || $scope.CurrentCruiseNum == undefined)
            $scope.invalidbooking = "True";
        else {
            //change to use cruise type criteria as first selection
            //$scope.GetAllShips();
            $scope.GetAllCruiseTypes();
            $scope.GetAgentForBooking();
        }

        $scope.t2BookingInit = false;

        if ($scope.folio1 != undefined && $scope.folio2 == undefined) {
            $scope.numpassengers = 1;
        }
        if ($scope.folio1 != undefined && $scope.folio2 != undefined) {
            $scope.numpassengers = 2;
        }
    }

    $scope.GetAllSpecialOccasions = function () {
        $http({
            method: "get",
            url: internalbasePath + "PIF/Get_AllSpecialOccasions",

        }).then(function (response) {
            $scope.SpecialOccasionsList = response.data;
            console.log("$scope.SpecialOccasions", $scope.SpecialOccasionsList);
        }, function () {
            alert("Error Occurred");
        })
    }

    $scope.GetOnboardBookingAddItems = function () {
        params = {};
        params.obbuid = $scope.obbuid;
        $scope.SyncPromise = $http({
            method: "post",
            url: basePath + "GetOnboardBookingAddItems",
            datatype: "application/json",
            data: JSON.stringify(params)
        }).then(function (response) {
            console.log("GetOnboardBookingAddItems", response.data);
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {
                    if (Response.GetOnboardBookingAddItems.Result.Status == "A") {
                        $scope.optAirFairSelected = undefined;
                        $scope.optPreCruiseSelected = undefined;
                        $scope.optPostCruiseSelected = undefined;
                        var item = {};
                        if (Response.GetOnboardBookingAddItems.AddItemsList.length > 0) {
                            $scope.AddedItems = Response.GetOnboardBookingAddItems.AddItemsList;
                            Response.GetOnboardBookingAddItems.AddItemsList.forEach(element => {
                                $scope.AirFair.forEach(af => {
                                    if (element.opiitiuid == af.ItemId) {
                                        item = {};
                                        item.ItemId = af.ItemId;
                                        if (af.RateList != null) {
                                            item.price = af.RateList[0].Price;
                                        }
                                        else {
                                            item.price = 0.00;
                                        }
                                        item.quantity = $scope.numfolios;
                                        $scope.optAirFairSelected = item;

                                        $scope.airfairselectedmodel = af.ItemId;
                                    }
                                });

                                $scope.PreCruise.forEach(af => {
                                    if (element.opiitiuid == af.ItemId) {
                                        item = {};
                                        item.ItemId = af.ItemId;
                                        if (af.RateList != null) {
                                            item.price = af.RateList[0].Price;
                                        }
                                        else {
                                            item.price = 0.00;
                                        }
                                        item.quantity = $scope.numfolios;
                                        $scope.optPreCruiseSelected = item;

                                        $scope.preoptselectedmodel = af.ItemId;
                                    }
                                });

                                $scope.PostCruise.forEach(af => {
                                    if (element.opiitiuid == af.ItemId) {
                                        item = {};
                                        item.ItemId = af.ItemId;
                                        if (af.RateList != null) {
                                            item.price = af.RateList[0].Price;
                                        }
                                        else {
                                            item.price = 0.00;
                                        }
                                        item.quantity = $scope.numfolios;
                                        $scope.optPostCruiseSelected = item;

                                        $scope.postoptselectedmodel = af.ItemId;
                                    }
                                });
                            })
                        }

                        if ($scope.getcfar1) {
                            $scope.getCFAR();
                        }
                    }
                    if (Response.GetOnboardBookingAddItems.Result.Status == "U") {
                        alert("Unuathorized for GetOnboardBookingAddItems");
                    }
                }
            }
            else
                alert(response.statusText);
        }, function () {
            alert("Error Occurred - GetOnboardBookingAddItems");
        })
    };

    $scope.GetAllFlights = function () {
        $scope.AirFair = [];
        $http({
            method: "get",
            datatype: "application/json",
            url: basePath + "GetItemsForCruise&EventID=" + $scope.EventID + "&GroupType=FL&TypeCode="
        }).then(function (response) {
            Response = response.data;
            //console.log("Air Fair", response);
            if (response.data !== "") {
                if (Response.GetItemsForCruise.Result.Status == "A") {
                    $scope.AirFair = Response.GetItemsForCruise.ItemList;
                }
                if (Response.GetItemsForCruise.Result.Status == "U") {
                    alert("Unuathorized for GetDepartureDatesforShip");
                }
            }
            if ($scope.AirFair.length > 0) {
                var afs = [];
                if ($scope.numfolios == 1) {
                    $scope.AirFair.forEach(pc => {
                        if (pc.Name.indexOf("(Double)") == -1) {
                            afs.push(pc);
                        }
                    }
                    )
                    $scope.AirFair = afs;
                }
                if ($scope.numfolios == 2) {
                    $scope.AirFair.forEach(pc => {
                        if (pc.Name.indexOf("(Single)") == -1) {
                            afs.push(pc);
                        }
                    }
                    )
                    $scope.AirFair = afs;
                }

                var item = {};
                item.ItemId = 0;
                item.Name = "Airfare Declined";
                $scope.AirFair.push(item);
            }
        }, function () {
            alert("Error Occurred");
        })
    };

    $scope.GetAllPreCruise = function () {
        $http({
            method: "get",
            datatype: "application/json",
            url: basePath + "GetItemsForCruise&EventID=" + $scope.EventID + "&GroupType=HT&TypeCode=PKG-PRE"
        }).then(function (response) {
            Response = response.data;
            //console.log("Pre Cruise", response);
            if (response.data !== "") {
                if (Response.GetItemsForCruise.Result.Status == "A") {
                    $scope.PreCruise = Response.GetItemsForCruise.ItemList;

                    if ($scope.PreCruise.length > 0) {
                        var precs = [];
                        if ($scope.numfolios == 1) {
                            $scope.PreCruise.forEach(pc => {
                                if (pc.Name.indexOf("(Double)") == -1) {
                                    precs.push(pc);
                                }
                            }
                            )
                            $scope.PreCruise = precs;
                        }
                        if ($scope.numfolios == 2) {
                            $scope.PreCruise.forEach(pc => {
                                if (pc.Name.indexOf("(Single)") == -1) {
                                    precs.push(pc);
                                }
                            }
                            )
                            $scope.PreCruise = precs;
                        }
                    }
                    console.log("$scope.PreCruise", $scope.PreCruise);
                    if ($scope.PreCruise.length == 1 && $scope.PreCruise[0].Name == "Hotel Declined") {
                        $scope.preoptselectedmodel = $scope.PreCruise[0].ItemId;
                        $scope.optPreCruiseSelected = $scope.PreCruise[0];
                    }
                    console.log("$scope.preoptselectedmodel", $scope.preoptselectedmodel);
                    console.log("$scope.optPreCruiseSelected", $scope.optPreCruiseSelected);
                }
                if (Response.GetItemsForCruise.Result.Status == "U") {
                    alert("Unuathorized for GetDepartureDatesforShip");
                }
            }
        }, function () {
            alert("Error Occurred");
        })
    };

    $scope.GetAllPostCruise = function () {
        $scope.PostCruise = [];
        $http({
            method: "get",
            datatype: "application/json",
            url: basePath + "GetItemsForCruise&EventID=" + $scope.EventID + "&GroupType=HT&TypeCode=PKG-POST"
        }).then(function (response) {
            Response = response.data;
            //console.log("Post Cruise", response);
            if (response.data !== "") {
                if (Response.GetItemsForCruise.Result.Status == "A") {
                    $scope.PostCruise = Response.GetItemsForCruise.ItemList;
                }
                if (Response.GetItemsForCruise.Result.Status == "U") {
                    alert("Unuathorized for GetDepartureDatesforShip");
                }
            }
            if ($scope.PostCruise.length > 0) {
                var postcs = [];
                if ($scope.numfolios == 1) {
                    $scope.PostCruise.forEach(pc => {
                        if (pc.Name.indexOf("(Double)") == -1) {
                            postcs.push(pc);
                        }
                    }
                    )
                    $scope.PostCruise = postcs;
                }
                if ($scope.numfolios == 2) {
                    $scope.PostCruise.forEach(pc => {
                        if (pc.Name.indexOf("(Single)") == -1) {
                            postcs.push(pc);
                        }
                    }
                    )
                    $scope.PostCruise = postcs;
                }

                var item = {};
                item.ItemId = 0;
                item.Name = "Post Cruise Package Declined";
                $scope.PostCruise.push(item);
            }
        }, function () {
            alert("Error Occurred");
        })
    };

    $scope.GetAllLandPackages = function () {
        $http({
            method: "get",
            datatype: "application/json",
            url: basePath + "GetItemsForCruise&EventID=" + $scope.EventID + "&GroupType=OT&TypeCode=LAND"
        }).then(function (response) {
            Response = response.data;
            //console.log("Pre Cruise", response);
            if (response.data !== "") {
                if (Response.GetItemsForCruise.Result.Status == "A") {
                    $scope.LandPackages = Response.GetItemsForCruise.ItemList;
                    if ($scope.LandPackages != undefined || $scope.LandPackages.length > 0)
                        $scope.LandPackagesSel = $scope.LandPackages[0];
                    $scope.GetItineraryDisplay();
                    //if ($scope.LandPackages.length > 0) {
                    //    var precs = [];
                    //    if ($scope.numfolios == 1) {
                    //        $scope.LandPackages.forEach(pc => {
                    //            if (pc.Name.indexOf("(Double)") == -1) {
                    //                precs.push(pc);
                    //            }
                    //        }
                    //        )
                    //        $scope.PreCruise = precs;
                    //    }
                    //    if ($scope.numfolios == 2) {
                    //        $scope.LandPackages.forEach(pc => {
                    //            if (pc.Name.indexOf("(Single)") == -1) {
                    //                precs.push(pc);
                    //            }
                    //        }
                    //        )
                    //        $scope.LandPackages = precs;
                    //    }
                    //}
                    console.log("$scope.LandPackages", $scope.LandPackages);

                }
                if (Response.GetItemsForCruise.Result.Status == "U") {
                    alert("Unuathorized for GetItemsForCruise");
                }
            }
        }, function () {
            alert("Error Occurred");
        })
    };

    $scope.GetAllMidCruisePackages = function () {
        $http({
            method: "get",
            datatype: "application/json",
            url: basePath + "GetItemsForCruise&EventID=" + $scope.EventID + "&GroupType=OT&TypeCode=PKG-MID"
        }).then(function (response) {
            Response = response.data;
            //console.log("Pre Cruise", response);
            if (response.data !== "") {
                if (Response.GetItemsForCruise.Result.Status == "A") {
                    $scope.MidCruisePackages = Response.GetItemsForCruise.ItemList;

                    console.log("$scope.MidCruisePackages", $scope.MidCruisePackages);

                }
                if (Response.GetItemsForCruise.Result.Status == "U") {
                    alert("Unuathorized for GetItemsForCruise");
                }
            }
        }, function () {
            alert("Error Occurred");
        })
    };

    $scope.sortBy = function (propertyName) {
        $scope.reverse = (propertyName !== null && $scope.propertyName === propertyName)
            ? !$scope.reverse : false;
        $scope.propertyName = propertyName;
        $scope.ShipPersonnels = orderBy($scope.ShipPersonnels, $scope.propertyName, $scope.reverse);
    };

    $scope.getref = function () {
        $http({
            method: "get",
            datatype: "application/json",
            //data: JSON.stringify(params),
            url: "https://auth.americancruiselines.com/myorgin"

        }).then(function (response) {
            Response = response.data;
            $scope.referrer = Response;

        }, function () {
            alert("Error Occurred");
        })
    }

    $scope.getip = function () {
        $http({
            method: "get",
            datatype: "application/json",
            //data: JSON.stringify(params),
            url: "https://ipinfo.io/json"

        }).then(function (response) {
            Response = response.data;
            $scope.ipaddress = Response.ip;
            if ($scope.ipaddress != $scope.devip)
                if ($scope.ipaddress != $scope.officeip) {
                    $scope.invalidbooking = "True";
                }

        }, function () {
            alert("Error Occurred");
        })
    }

    $scope.GetOBMarketingType = function () {

        params = {};
        params.shpcode = $scope.CurrShip;
        $scope.SyncPromise = $http({
            method: "post",
            datatype: "application/json",
            data: JSON.stringify(params),

            url: basePath + "GetOnboardMarketingType"

        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {

                    if (Response.GetOnboardMarketingType.Result.Status == "A") {
                        $scope.ShipInfo = Response.GetOnboardMarketingType.ShipInfo;
                        $scope.mkttyp = $scope.ShipInfo.shpRebookMktTypeCode;


                    }
                    if (Response.GetOnboardMarketingType.Result.Status == "U") {
                        alert("Unuathorized for GetOnboardMarketingType");
                    }
                }
            }
            else
                alert(response.statusText);

        }, function () {
            alert("Error Occurred");
        })

    }
    $scope.GetAllCruiseTypes = function () {

        params = {};
        $scope.SyncPromise = $http({
            method: "post",
            datatype: "application/json",
            data: JSON.stringify(params),

            url: basePath + "GetAllCruiseTypes"

        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {

                    if (Response.GetAllCruiseTypes.Result.Status == "A") {
                        $scope.CruiseTypes = Response.GetAllCruiseTypes.CruiseTypeList;


                    }
                    if (Response.GetAllCruiseTypes.Result.Status == "U") {
                        alert("Unuathorized for GetAllCruiseTypes");
                    }
                }
            }
            else
                alert(response.statusText);

        }, function () {
            alert("Error Occurred");
        })

    }
    $scope.GetShipsForCruiseType = function () {

        if ($scope.CruiseType.trim() == 'ALL')
            $scope.GetAllShips();
        else {
            params = {};
            params.cruisetype = $scope.CruiseType;
            $scope.SyncPromise = $http({
                method: "post",
                datatype: "application/json",
                data: JSON.stringify(params),

                url: basePath + "GetShipsForCruiseType"

            }).then(function (response) {
                if (response.status == 200) {
                    Response = response.data;
                    if (response.data !== "") {

                        if (Response.GetShipsForCruiseType.Result.Status == "A") {
                            $scope.Ships = Response.GetShipsForCruiseType.ShipList;
                            if ($scope.Ships.length == 1) {
                                $scope.ShipSel = $scope.Ships[0].FacilityId;
                                $scope.GetDeparturesForShip(); $scope.changeselection = true;
                            }

                        }
                        if (Response.GetShipsForCruiseType.Result.Status == "U") {
                            alert("Unuathorized for GetAllCruiseTypes");
                        }
                    }
                }
                else
                    alert(response.statusText);

            }, function () {
                alert("Error Occurred");
            })
        }

    }

    $scope.GetAllShips = function () {
        params = {};
        $scope.SyncPromise = $http({
            method: "post",
            datatype: "application/json",
            data: JSON.stringify(params),

            url: basePath + "GetAllShipNames"

        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {

                    if (Response.GetAllShipNames.Result.Status == "A") {
                        $scope.Ships = Response.GetAllShipNames.FacilityList;


                    }
                    if (Response.GetAllShipNames.Result.Status == "U") {
                        alert("Unuathorized for GetDepartureDatesforShip");
                    }
                }
            }
            else
                alert(response.statusText);

        }, function () {
            alert("Error Occurred");
        })

    }
    function addDays(date, days) {
        date.setDate(date.getDate() + days);
        return date;
    }

    $scope.GetDeparturesForShip = function () {
        $scope.AirFair = undefined;
        $scope.PreCruise = undefined;
        $scope.PostCruise = undefined;
        $scope.airfairselectedmodel = undefined;
        $scope.preoptselectedmodel = undefined;
        $scope.postoptselectedmodel = undefined;
        $scope.ItineraryDisplay = undefined;
        if (!$scope.t2BookingInit) {
            $scope.EventID = undefined;
            $scope.selCategory = undefined;
            $scope.selRoom = undefined;
        }
        params = {};
        params.FacilityID = $scope.ShipSel;
        params.FutureInd = 1;
        if ($scope.CruiseType.trim() == "ALL")
            params.Region = '';
        else
            params.Region = $scope.CruiseType.trim();

        $scope.SyncPromise = $http({
            method: "post",
            url: basePath + "GetDepartureDatesforShip",
            datatype: "application/json",
            data: JSON.stringify(params)
        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {

                    if (Response.GetDepartureDatesforShip.Result.Status == "A") {

                        tempdepartures = Response.GetDepartureDatesforShip.EventList;
                        tempdepartures.forEach(af => {
                            if (af.BegLocation == 'JAC' || af.BegLocation == 'TYS') {
                                date = af.BegDate + '.000Z';
                                date = date.substring(0, 10).split('-')
                                date = date[1] + '-' + date[2] + '-' + date[0]
                                tempdate = new Date(date);
                                if (af.BegLocation == 'JAC') {
                                    newdate = addDays(tempdate, -7);
                                }
                                else if (af.BegLocation == 'TYS') {
                                    newdate = addDays(tempdate, -3);
                                }
                                af.BegDate = newdate;

                            }
                            else {
                                date = af.BegDate + '.000Z';
                                date = date.substring(0, 10).split('-')
                                date = date[1] + '-' + date[2] + '-' + date[0]
                                tempdate = new Date(date);
                                newdate = addDays(tempdate, 0);
                                af.BegDate = newdate;
                            }
                        });
                        $scope.Departures = tempdepartures;
                        if ($scope.EventID != undefined) {

                            $scope.GetItineraryDisplay();
                        }
                    }
                    if (Response.GetDepartureDatesforShip.Result.Status == "U") {
                        alert("Unuathorized for GetDepartureDatesforShip");
                    }
                }
            }
            else
                alert(response.statusText);
        }, function () {
            alert("Error Occurred");
        })

    }
    $scope.GetCategoriesForCruise = function () {
        $scope.AirFair = undefined;
        $scope.PreCruise = undefined;
        $scope.PostCruise = undefined;
        $scope.airfairselectedmodel = undefined;
        $scope.preoptselectedmodel = undefined;
        $scope.postoptselectedmodel = undefined;
        if (!$scope.t2BookingInit) {
            $scope.selCategory = undefined;
            $scope.selRoom = undefined;
            $scope.CFAR = undefined;
            $scope.getcfar1 = false;
            var getcfar = false;
        }
        else {
            $scope.getcfar1 = true;
            var getcfar = true;
        }
        params = {};
        //GetCategoriesforShip?eventID=5020&priceIndicator=0&availIndicator=0
        params.eventID = $scope.EventID;
        params.priceIndicator = 0;
        params.availIndicator = 1;
        thejson = JSON.stringify(params);
        $scope.SyncPromise = $http({
            method: "post",
            url: basePath + "GetCategoriesforShip",
            datatype: "application/json",
            data: JSON.stringify(params)
        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {

                    if (Response.GetCategoriesforShip.Result.Status == "A") {
                        tempcategories = Response.GetCategoriesforShip.CategoryList;
                        finalcategories = [];
                        for (i = 0; i < tempcategories.length; i++) {
                            if (tempcategories[i].RegularCapacity >= $scope.numfolios)
                                finalcategories.push(tempcategories[i]);

                        }
                        $scope.Categories = finalcategories;
                        // $scope.Categories = Response.GetCategoriesforShip.CategoryList;


                        $scope.GetAvailableRooms();

                        if (getcfar && $scope.obbuid == undefined) {
                            $scope.getCFAR();
                        }
                        else {
                            $scope.GetOnboardBookingAddItems();
                        }

                    }
                    if (Response.GetCategoriesforShip.Result.Status == "U") {
                        alert("Unuathorized for GetCategoriesforShip");
                    }
                }
            }
            else
                alert(response.statusText);


        }, function () {
            alert("Error Occurred");
        })

    }

    $scope.GetAvailableRooms = function () {
        if ($scope.selCategory !== null) {
            //roomlist = [];
            //catroomlist = [];
            //category = {};
            $scope.AvailRoomList = [];
            if ($scope.selCategory == undefined) {
                for (i = 0; i < $scope.Categories.length; i++) {
                    $scope.GetRoomsForCategory($scope.Categories[i].CategoryId);
                    //     roomlist.push[catroomlist];
                }
                //$scope.AvailRoomList = roomlist;
            }
            else
                $scope.GetRoomsForCategory($scope.selCategory);
            //*** Filter the rooms based on number of folios vs capacity of the rool
        }
    }
    $scope.GetRoomsForCategory = function (CategoryID) {
        params = {};

        params.CategoryID = CategoryID;
        params.EventID = $scope.EventID;
        params.AvailIndicator = 1;
        thejson = JSON.stringify(params);
        $scope.SyncPromise = $http({
            method: "post",
            url: basePath + "GetRoomsForCategory",
            datatype: "application/json",
            data: JSON.stringify(params)
        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {
                    if (Response.GetRoomsForCategory.Result.Status == "A") {
                        for (n = 0; n < Response.GetRoomsForCategory.UnitList.length; n++) {
                            sUnitCode = $scope.numfolios && Response.GetRoomsForCategory.UnitList[n].Code.toString();
                            if (Response.GetRoomsForCategory.UnitList[n].Capacity >= $scope.numfolios && sUnitCode.length < 4)
                                $scope.AvailRoomList.push(Response.GetRoomsForCategory.UnitList[n]);
                        }
                    }
                    if (Response.GetRoomsForCategory.Result.Status == "U") {
                        alert("Unuathorized for GetRoomsForCategory");

                    }
                }
            }

            else
                alert(response.statusText);
        }

            , function () {
                alert("Error Occurred");
            })

    }
    $scope.GetAgentForBooking = function () {
        params = {};
        if ($scope.currbooking == undefined)
            params.BookingId = $scope.currbookingId;
        else
            params.BookingCode = $scope.currbooking;

        $scope.SyncPromise = $http({
            method: "post",
            url: basePath + "GetAgentAssociatedWBooking",
            datatype: "application/json",
            data: JSON.stringify(params)
        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {

                    if (Response.GetAgentAssociatedWBooking.Result.Status == "A") {
                        $scope.currAgency = Response.GetAgentAssociatedWBooking.Agency;

                    }
                    if (Response.GetAgentAssociatedWBooking.Result.Status == "U") {
                        alert("Unuathorized for GetAgentForBooking");
                    }
                }
            }

            else
                alert(response.statusText);


        }, function (response) {

            alert("Error Occurred");
        })



    }

    $scope.getOptions = function () {
        $scope.GetAllFlights();
        $scope.GetAllPreCruise();
        $scope.GetAllPostCruise();
        //why commented out?
        $scope.GetAllLandPackages();
        $scope.GetAllMidCruisePackages();

        $scope.optAirFairSelected = undefined;
        $scope.optPreCruiseSelected = undefined;
        $scope.optPostCruiseSelected = undefined;
        // $scope.optAirFairItemSelected = undefined;
        // $scope.optPreCruiseItemSelected = undefined;
        // $scope.optPostCruiseItemSelected = undefined;
    }

    $scope.selectionChanged = function () {
        $scope.changeselection = true;
    }

    $scope.CompleteResevations = function () {
        if ($scope.changeselection == true) {
            $scope.MakeTentativeBooking();
        }
        else {
            //$scope.getInvoiceImage();
            $scope.getDepositAmount();
            $scope.MakePayment();
            $scope.BookingSubmitted = 'True';
            $scope.completepayment = false;
        }
    }

    $scope.MakeTentativeBooking = function () {
        params = {};

        params.eventId = $scope.EventID;
        if ($scope.folio2 == undefined)
            params.folioIds = $scope.folio1;
        else
            params.folioIds = $scope.folio1 + ";" + $scope.folio2;
        if ($scope.selRoom == undefined)
            params.RoomNumber = "";
        else
            params.RoomNumber = $scope.selRoom;
        if ($scope.selCategory == undefined) {
            for (f = 0; f < $scope.AvailRoomList.length; f++) {
                if ($scope.AvailRoomList[f].UnitId == $scope.selRoom)
                    params.category = $scope.AvailRoomList[f].CategoryId;
            }
        }
        //    params.category = "";
        else
            params.category = $scope.selCategory.toString();
        if ($scope.ApplyToAgent == undefined || $scope.ApplyToAgent == false)
            params.agentID = defaultagentid;
        else
            params.agentID = $scope.currAgency.AgentId;
        params.MarketingType = $scope.mkttyp;

        //parse out selCFAR to determine if confirmed or not
        if (typeof $scope.selCFAR === 'string' || $scope.selCFAR instanceof String) {
            if ($scope.selCFAR.includes(":")) {
                params.cfarItem = $scope.selCFAR.slice(0, $scope.selCFAR.indexOf(':'));
                $scope.deliverytype = $scope.selCFAR.substr($scope.selCFAR.indexOf(':') + 1, 1);
                params.deliverytype = $scope.deliverytype;
            }
            else
                params.cfarItem = $scope.selCFAR;
        }
        else
            params.cfarItem = $scope.selCFAR;
        //params.MarketingType = " ";
        //thejson = JSON.stringify(params);

        var optSelectedItemIds = [];
        if ($scope.optAirFairSelected != undefined) {
            optSelectedItemIds.push({
                "itemID": $scope.optAirFairSelected.ItemId
            });
        }
        if ($scope.optPreCruiseSelected != undefined) {
            optSelectedItemIds.push({
                "itemID": $scope.optPreCruiseSelected.ItemId
            });
        }
        if ($scope.optPostCruiseSelected != undefined) {
            optSelectedItemIds.push({
                "itemID": $scope.optPostCruiseSelected.ItemId
            });
        }
        //if there are land packages include them automatically

        if ($scope.LandPackages != undefined && $scope.LandPackages.length > 0) {
            $scope.LandPackages.forEach(lp => {
                optSelectedItemIds.push({
                    "itemID": lp.ItemId
                });
            });
        }
        //if ($scope.LandPackagesSel != undefined) {
        //    optSelectedItemIds.push({
        //        "itemID": $scope.LandPackagesSel.ItemId
        //    });
        //}
        //if there are mid cruise packages include them automatically

        if ($scope.MidCruisePackages != undefined && $scope.MidCruisePackages.length > 0) {
            $scope.MidCruisePackages.forEach(mcp => {
                optSelectedItemIds.push({
                    "itemID": mcp.ItemId
                });
            });
        }
        // params.discountCode = "ONBOARD15";
        params.AddItems = optSelectedItemIds;
        console.log("MakeTentativeBooking_params", params);

        $scope.SyncPromise = $http({
            method: "post",
            url: basePath + "MakeTentativeBooking",
            datatype: "application/json",
            data: JSON.stringify(params)
        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {

                    if (Response.MakeTentativeBooking.Result.Status == "A") {

                        $scope.bookingId = Response.MakeTentativeBooking.ResTentativeBooking.bookingId;
                        $scope.invoiceId = Response.MakeTentativeBooking.ResTentativeBooking.invoiceId;

                        $scope.SaveTentativeBooking();
                        // alert("Tentative Booking Created - Invoice ID = " + $scope.invoiceId);
                        //$scope.getInvoiceImage();
                        $scope.getDepositAmount();
                        $scope.BookingSubmitted = 'True';
                        $scope.completepayment = false;
                        var catName = $scope.Categories.filter(item => item.CategoryId === $scope.selCategory)[0];
                        $scope.kingshow = true;
                        $scope.twotwinshow = true;
                        $scope.stayingsingleshow = true;
                        if ($scope.numpassengers == 1 &&
                            (catName.Code == "SGB" || catName.Code == "SGLBAL" ||
                                catName.Code == "SGL" || catName.Code == "SGL BAL" ||
                                catName.Code == "SG")) {
                            $scope.kingshow = false;
                            $scope.twotwinshow = false;
                            $scope.stayingsingleshow = true;
                            $scope.bedsize = 'Single';
                            $scope.p1ChangeBedding = true;
                        }
                        else {
                            $scope.kingshow = true;
                            $scope.twotwinshow = true;
                            $scope.stayingsingleshow = false;
                        }

                        if ($scope.numpassengers > 1) {
                            $scope.kingshow = true;
                            $scope.twotwinshow = true;
                            $scope.stayingsingleshow = false;
                        }
                        if ($scope.numpassengers == 1) {
                            $scope.soparticipate1 == true;
                        }

                    }
                    if (Response.MakeTentativeBooking.Result.Status == "U") {
                        alert("Unuathorized for MakeTentativeBooking");
                    }
                    if (Response.MakeTentativeBooking.Result.Status == "R") {
                        alert("There was a problem creating your booking.  Please try again or contact customer service at 1- 800 - 894 - 8570. ") + Response.MakeTentativeBooking.Result.Message;
                        //$scope.GetAllData();
                        $scope.BookingSubmitted = 'False';
                        $scope.completepayment = false;
                        $scope.takepayment = false;
                        $scope.selRoom = undefined;
                        $scope.DepositZipCode = undefined;
                        $scope.DepositLastName = undefined;
                        $scope.DepositFirstName = undefined;
                        $scope.depositAmount = undefined;
                        $scope.GetAvailableRooms();

                    }
                }


            }
            else
                alert(response.statusText);

        }, function () {
            alert("Error Occurred");
        })

    }

    $scope.clearEmpty = function () {
        window.close();
    }
    $scope.getInvoiceImage = function () {
        params = {};

        // params.bookingId = "";
        params.bookingId = $scope.bookingId;
        params.bookingCode = "";
        params.invoiceId = $scope.invoiceId;
        params.LatestInvoiceInd = "";
        $scope.SyncPromise = $http({
            method: "post",
            url: basePath + "GetReceiptImage",
            datatype: "application/json",
            data: JSON.stringify(params)
        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {
                    if (Response.GetReceiptImage.Result.Status == "A") {
                        if (Response.GetReceiptImage.Booking.InvoiceList.length != 0) {
                            $scope.invoiceImage = Response.GetReceiptImage.Booking.InvoiceList[0].InvoiceImage;
                            $scope.invoiceTotalDue = Response.GetReceiptImage.Booking.InvoiceList[0].Amount;
                            $scope.getDepositAmount();
                        }

                        else
                            alert("No Receipt available.");
                        $scope.BookingSubmitted = 'True';
                        $scope.completepayment = false;

                    }
                    if (Response.GetReceiptImage.Result.Status == "U") {
                        alert("Unuathorized for GetReceiptImage");
                    }
                }
            }
            else
                alert(response.statusText);

        }, function () {
            alert("Error Occurred");
        })

    }


    $scope.getReceiptImage = function () {
        params = {};

        // params.bookingId = "";
        params.bookingId = $scope.bookingId;
        //params.bookingCode = "";
        //params.invoiceId = $scope.invoiceId;
        params.LatestInvoiceInd = "1";
        $scope.SyncPromise = $http({
            method: "post",
            url: basePath + "GetReceiptImage",
            datatype: "application/json",
            data: JSON.stringify(params)
        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {
                    if (Response.GetReceiptImage.Result.Status == "A") {
                        if (Response.GetReceiptImage.Booking.InvoiceList.length != 0) {
                            $scope.receiptImage = Response.GetReceiptImage.Booking.InvoiceList[0].InvoiceImage;
                            $scope.invoiceTotalDue = Response.GetReceiptImage.Booking.InvoiceList[0].Amount;
                        }
                        else
                            alert("No Receipt available.");
                        $scope.completepayment = true;

                    }
                    if (Response.GetReceiptImage.Result.Status == "U") {
                        alert("Unuathorized for GetReceiptImage");
                    }

                }
            }
            else
                alert(response.statusText);

        }, function () {
            alert("Error Occurred");
        })

    }

    $scope.makesplitpay = function () {
        $scope.depositAmount = $scope.mindepositAmount;
        if ($scope.splitPayment == "Yes") {
            $scope.depositAmount = $scope.mindepositAmount / 2;
            $scope.depositAmount2 = $scope.mindepositAmount / 2;
        }
        document.getElementById("confirm_deposit").setAttribute("aria-invalid", "false");
        document.getElementById("confirm_deposit2").setAttribute("aria-invalid", "false");
        $scope.amountinvalid = false;
    }

    $scope.autoAdjusted = false;
    $scope.chkAmount = function (flag) {
        if (flag == "1" && $scope.autoAdjusted == false) {
            $scope.depositAmount2 = parseFloat(($scope.mindepositAmount - $scope.depositAmount).toFixed(2));
            $scope.autoAdjusted = true;
        }
        if (flag == "2" && $scope.autoAdjusted == false) {
            $scope.depositAmount = parseFloat(($scope.mindepositAmount - $scope.depositAmount2).toFixed(2));
            $scope.autoAdjusted = true;
        }

        var da = $scope.depositAmount;
        $scope.amountinvalid = false;
        $scope.maxamountinvalid = false;
        document.getElementById("confirm_deposit").setAttribute("aria-invalid", "false");
        document.getElementById("confirm_deposit2").setAttribute("aria-invalid", "false");
        if ($scope.splitPayment == "Yes") {
            da = da + $scope.depositAmount2;
        }
        if ($scope.mindepositAmount > da) {
            $scope.amountinvalid = true;
            document.getElementById("confirm_deposit").setAttribute("aria-invalid", "true");
            document.getElementById("confirm_deposit2").setAttribute("aria-invalid", "true");
        }
        if (da > $scope.invoiceTotalDue) {
            $scope.maxamountinvalid = true;
            document.getElementById("confirm_deposit").setAttribute("aria-invalid", "true");
            document.getElementById("confirm_deposit2").setAttribute("aria-invalid", "true");
        }
    }

    $scope.getDepositAmount = function () {
        params = {};

        // params.bookingId = "";
        params.bookingId = $scope.bookingId;

        $scope.SyncPromise = $http({
            method: "post",
            url: basePath + "GetBookingPrice",
            datatype: "application/json",
            data: JSON.stringify(params)
        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {
                    if (Response.GetBookingPrice.Result.Status == "A") {
                        if (Response.GetBookingPrice.Price.chargePrice == "full") {
                            $scope.depositAmount = parseFloat($scope.invoiceTotalDue.toFixed(2));
                            $scope.mindepositAmount = parseFloat($scope.invoiceTotalDue.toFixed(2));
                        }
                        else {
                            if ($scope.deliverytype == 'M') {
                                $scope.depositAmount = parseInt(Response.GetBookingPrice.Price.chargePrice) + ($scope.CFAR[1].RateList[0].Price * $scope.numfolios);
                                $scope.mindepositAmount = parseInt(Response.GetBookingPrice.Price.chargePrice) + ($scope.CFAR[1].RateList[0].Price * $scope.numfolios);
                            }
                            else {
                                $scope.depositAmount = parseInt(Response.GetBookingPrice.Price.chargePrice);
                                $scope.mindepositAmount = parseInt(Response.GetBookingPrice.Price.chargePrice);
                            }
                        }
                    }
                    if (Response.GetBookingPrice.Result.Status == "U") {
                        alert("Unuathorized for GetBookingPrice");
                    }
                }
            }
            else
                alert(response.statusText);

        }, function () {
            alert("Error Occurred");
        })

    }
    function responseHandler(response) {
        try {
            if (response.messages.resultCode === "Error") {
                var i = 0;
                while (i < response.messages.message.length) {
                    console.log(
                        response.messages.message[i].code + ": " +
                        response.messages.message[i].text
                    );
                    i = i + 1;
                }
                for (var i = 0; i < response.messages.message.length; i++) {
                    switch (response.messages.message[i].code) {
                        case "E_WC_07":
                        case "E_WC_08":
                        case "E_WC_06":
                            alert("We have encountered an error processing your payment.  Please confirm your expiration date and resubmit, or contact us at 800-460-4518 for assistance.");
                            break;
                        case "E_WC_04":
                        case "E_WC_05":
                            alert("We have encountered an error processing your payment.  Please confirm your card information and resubmit, or contact us at 800-460-4518 for assistance.");
                            break;
                        case "E_WC_15":
                            alert("We have encountered an error processing your payment.  Please provide a valid CVV and resubmit, or contact us at 800-460-4518 for assistance.");
                            break;
                        case "E_WC_16":
                            alert("We have encountered an error processing your payment.  Please provide a valid Zip Code and resubmit, or contact us at 800-460-4518 for assistance.");
                            break;
                        case "E_WC_17":
                            alert("We have encountered an error processing your payment.  Please provide a valid first and last name for the card holder and resubmit, or contact us at 800-460-4518 for assistance.");
                            break;
                        default:
                            alert("We have encountered an error processing your payment.  Please confirm your card & billing information and resubmit, or contact us at 800-460-4518 for assistance.");
                            break;
                    }
                }
                ProcessPayment2();
            } else {
                paymentFormUpdate(response.opaqueData);
            }
            if ($scope.splitPayment != "Yes") {
                $scope.RequestBeddingUpdate();
                if ($scope.specialOccasion == "Yes") {
                    $scope.RequestUpdateSpecialOccassion();
                }
                if ($scope.travelfriends == "Yes") {
                    $scope.RequestUpdateTravellingWith();
                }
            }
        } catch (error) {
            console.log(error);
        }
    }
    function paymentFormUpdate(opaqueData) {
        //  document.getElementById("dataDescriptor").value = opaqueData.dataDescriptor;
        //  document.getElementById("dataValue").value = opaqueData.dataValue;
        $scope.opaqueData = opaqueData.dataValue;
        // If using your own form to collect the sensitive data from the customer,
        // blank out the fields before submitting them to your server.
        $scope.DepositCardNumber = undefined;
        $scope.DepositExpirationMonth = undefined;
        $scope.DepositExpirationYear = undefined;
        $scope.DepositCardAuthorizationCode = undefined;
        //  document.getElementById("DepositZipCode").value = "";
        //  document.getElementById("DepositLastName").value = "";
        //  document.getElementById("DepositFirstName").value = "";
        //  document.getElementById("depositAmount").value = "";
        $scope.RecordPayment();
        // document.getElementById("paymentForm").submit();
    }
    $scope.sendPaymentDataToAnet = function () {
        $scope.runQ = true;
        if ($scope.splitPayment == "Yes") {
            $scope.runQ = false;
        }

        var authData = {};
        $scope.paymenterror = undefined;
        authData.clientKey = clientKey;
        authData.apiLoginID = apiLoginID;

        var cardData = {};
        cardData.cardNumber = document.getElementById("DepositCardNumber").value;
        cardData.month = document.getElementById("DepositExpirationMonth").value;
        cardData.year = document.getElementById("DepositExpirationYear").value;
        cardData.cardCode = document.getElementById("DepositCardAuthorizationCode").value;
        var firstName = document.getElementById("DepositFirstName").value
        var lastName = document.getElementById("DepositLastName").value;
        cardData.zip = document.getElementById("DepositZipCode").value;
        $scope.zip = cardData.zip;
        $scope.firstName = firstName;
        $scope.lastName = lastName;
        cardData.fullName = firstName + " " + lastName;

        cardData.amount = document.getElementById("confirm_deposit").value;
        //cardData.amount = "1000";
        var secureData = {};
        secureData.authData = authData;
        secureData.cardData = cardData;

        Accept.dispatchData(secureData, responseHandler);
    }
    $scope.ViewInvoice = function () {
        window.open("data:application/pdf," + encodeURI($scope.invoiceImage));
    }
    $scope.MakePayment = function () {
        $scope.takepayment = true;
        $scope.completepayment = false;
    }

    $scope.sochanged = function (specOcc) {
        $scope.selectedso = specOcc.typString1;
    }

    $scope.beddingSubmitted = undefined;
    $scope.RequestBeddingUpdate = function () {
        if ($scope.bedsize != undefined) {
            params = {};
            params.BookingId = $scope.bookingId;
            params.FolioId = $scope.folio1; //selfolio;
            params.bedsize = $scope.bedsize;

            if ($scope.beddingSubmitted == undefined) {
                $scope.SyncPromise = $http({
                    method: "post",
                    url: basePath + "UpdateBedding",
                    datatype: "application/json",
                    data: JSON.stringify(params)
                }).then(function (response) {
                    if (response.status == 200) {
                        Response = response.data;
                        $scope.beddingSubmitted = true;
                    } else
                        alert(response.statusText);

                }, function () {
                    alert("Error Occurred");
                })
            }

        }
    }

    $scope.specialOccasionSubmitted = undefined;
    $scope.selectedso = '';
    $scope.RequestUpdateSpecialOccassion = function () {
        params = {};
        params.BookingId = $scope.bookingId;
        params.SpecialOccasions = $scope.selectedso;
        params.otherspecOcc = $scope.otherspecOcc;
        params.specOccDate = $scope.specOccDate;

        var specoccFolio = [];
        if ($scope.soparticipate1 != undefined && $scope.soparticipate1 == true) {
            specoccFolio.push({
                "FolioId": $scope.folio1
            });
        }
        if ($scope.soparticipate2 != undefined && $scope.soparticipate2 == true) {
            specoccFolio.push({
                "FolioId": $scope.folio2
            });
        }
        params.FolioList = specoccFolio;

        if ($scope.specialOccasionSubmitted == undefined) {
            $scope.SyncPromise = $http({
                method: "post",
                url: basePath + "UpdateSpecialOccassion",
                datatype: "application/json",
                data: JSON.stringify(params)
            }).then(function (response) {
                if (response.status == 200) {
                    Response = response.data;
                    $scope.specialOccasionSubmitted = true;
                } else
                    alert(response.statusText);

            }, function () {
                alert("Error Occurred");
            })
        }
    }

    $scope.travelWithSubmitted = undefined;
    $scope.RequestUpdateTravellingWith = function () {
        params = {};
        params.BookingId = $scope.bookingId;
        params.FolioId = $scope.folio1; //selfolio;

        var TravelWith = [];
        if ($scope.travelfriendsname1 != undefined && $scope.travelfriendstateroom1 != undefined) {
            TravelWith.push({
                "travelfriendnames": $scope.travelfriendsname1,
                "travelfriendstateroom": $scope.travelfriendstateroom1
            });
        }
        if ($scope.travelfriendsname2 != undefined && $scope.travelfriendstateroom2 != undefined) {
            TravelWith.push({
                "travelfriendnames": $scope.travelfriendsname2,
                "travelfriendstateroom": $scope.travelfriendstateroom2
            });
        }
        if ($scope.travelfriendsname3 != undefined && $scope.travelfriendstateroom3 != undefined) {
            TravelWith.push({
                "travelfriendnames": $scope.travelfriendsname3,
                "travelfriendstateroom": $scope.travelfriendstateroom3
            });
        }

        if (TravelWith.length > 0) {
            params.TravelWithList = TravelWith;

            if ($scope.travelWithSubmitted == undefined) {
                $scope.SyncPromise = $http({
                    method: "post",
                    url: basePath + "UpdateTravellingWith",
                    datatype: "application/json",
                    data: JSON.stringify(params)
                }).then(function (response) {
                    if (response.status == 200) {
                        Response = response.data;
                        $scope.travelWithSubmitted = true;
                    } else
                        alert(response.statusText);

                }, function () {
                    alert("Error Occurred");
                })
            }

        }
    }

    $scope.GRReq = false;
    $(".collapseicon").text('+');
    $scope.togglediv = function () {
        $scope.GRReq = !$scope.GRReq;
        $(".collapse").slideToggle();

        if ($scope.GRReq == false)
            $(".collapseicon").text('+');
        else
            $(".collapseicon").text('-');
    }

    $scope.RecordPayment = function () {
        if (typeof $scope.selCFAR === 'string' || $scope.selCFAR instanceof String) {
            if ($scope.selCFAR.includes(":")) {
                var cfaritem = $scope.selCFAR.slice(0, $scope.selCFAR.indexOf(':'));
            }
            else
                var cfaritem = $scope.selCFAR;
        }
        else
            var cfaritem = $scope.selCFAR;
        if (cfaritem == 491) { //CFAR declined
            //added logic to put in t2 status before trying to make payment
            t2params = {};
            t2params.BookingId = $scope.bookingId;
            $scope.SyncPromise = $http({
                method: "post",
                url: basePath + "ChangeBookingStatusT2",
                datatype: "application/json",
                data: JSON.stringify(t2params)
            }).then(function (response) {
                if (response.status == 200) {
                    Response = response.data;
                    if (response.data !== "") {
                        if (Response.ResChangeBookingStatusT2.Result.Status == "A") {
                            params = {};
                            params.authOnly = false;
                            params.bookingId = $scope.bookingId;
                            if ($scope.selfolio == 'Other')
                                params.folioId = $scope.selFolioOther;
                            else
                                params.folioId = $scope.selfolio;
                            params.amt = $scope.depositAmount;
                            params.eventId = $scope.EventID;
                            params.zip = $scope.zip;
                            params.firstName = $scope.firstName;
                            params.lastName = $scope.lastName;
                            params.opaqueDataVal = $scope.opaqueData;
                            params.fullbalance = $scope.invoiceTotalDue;
                            $scope.SyncPromise = $http({
                                method: "post",
                                url: basePath + "AuthorizePayment",
                                datatype: "application/json",
                                data: JSON.stringify(params)
                            }).then(function (response) {
                                if (response.status == 200) {
                                    Response = response.data;
                                    if (response.data !== "") {
                                        if (Response.AuthorizePayment.Result.Status == "A") {
                                            $scope.invoiceId = Response.AuthorizePayment.invoiceId;
                                            //  alert("Payment processed succesfully");
                                            //$scope.getReceiptImage();
                                            $scope.completepayment = true;
                                            $scope.updatePaymentStatus();
                                        }
                                        if (Response.AuthorizePayment.Result.Status == "U") {
                                            alert("Unuathorized for AuthorizePayment");
                                        }
                                        if (Response.AuthorizePayment.Result.Status == "R") {
                                            console.log(Response.AuthorizePayment.Result.Message);
                                            $scope.paymenterror = "There was a problem processing your credit card, Please confirm your payment information or contact customer service at 1- 800 - 894 - 8570";
                                            alert($scope.paymenterror);
                                        }
                                    }
                                    else
                                        alert("Error Occurred - No Data returned");

                                    ProcessPayment2();
                                }
                                else
                                    alert(response.statusText);

                            }, function () {
                                alert("Error Occurred");
                            })
                        }
                        if (Response.ResChangeBookingStatusT2.Result.Status == "U") {
                            alert("Unuathorized for ChangeBookingStatusT2");
                        }
                        if (Response.ResChangeBookingStatusT2.Result.Status == "R") {
                            console.log(Response.ResChangeBookingStatusT2.Result.Message);
                            $scope.paymenterror = "There was a problem processing this booking.  " + Response.ResChangeBookingStatusT2.Result.Message;
                            alert($scope.paymenterror);
                            $scope.BookingSubmitted = 'False';
                            $scope.completepayment = false;
                            $scope.takepayment = false;
                            $scope.selRoom = undefined;
                            $scope.DepositZipCode = undefined;
                            $scope.DepositLastName = undefined;
                            $scope.DepositFirstName = undefined;
                            $scope.depositAmount = undefined;
                            $scope.GetAvailableRooms();
                        }
                    }
                    else
                        alert("Error Occurred - No Data returned");
                }
                else
                    alert(response.statusText);

            }, function () {
                alert("Error Occurred");
            })
        }
        else {
            //CFAR accepted - call to confirm CFAR and mark as deluxe
            //added logic to put in t2 status before trying to make payment
            t2params = {};
            t2params.BookingId = $scope.bookingId;
            $scope.SyncPromise = $http({
                method: "post",
                url: basePath + "ChangeBookingStatusT2",
                datatype: "application/json",
                data: JSON.stringify(t2params)
            }).then(function (response) {
                if (response.status == 200) {
                    Response = response.data;
                    if (response.data !== "") {
                        if (Response.ResChangeBookingStatusT2.Result.Status == "A") {
                            //add code here to confirm CFAR
                            CFARparams = {};

                            CFARparams.BookingId = $scope.bookingId;


                            CFARparams.ConfirmedItemId = $scope.selCFAR.slice(0, $scope.selCFAR.indexOf(':'));
                            CFARparams.overrideDeliveryType = "O";

                            $scope.SyncPromise = $http({
                                method: "post",
                                url: basePath + "ConfirmCFAR",
                                datatype: "application/json",
                                data: JSON.stringify(CFARparams)
                            }).then(function (response) {
                                if (response.status == 200) {
                                    Response = response.data;
                                    if (response.data !== "") {
                                        if (Response.ConfirmCFAR.Result.Status == "A") {
                                            //end

                                            params = {};
                                            params.authOnly = false;
                                            params.bookingId = $scope.bookingId;
                                            if ($scope.selfolio == 'Other')
                                                params.folioId = $scope.selFolioOther;
                                            else
                                                params.folioId = $scope.selfolio;
                                            params.amt = $scope.depositAmount;
                                            params.eventId = $scope.EventID;
                                            params.zip = $scope.zip;
                                            params.firstName = $scope.firstName;
                                            params.lastName = $scope.lastName;
                                            params.opaqueDataVal = $scope.opaqueData;
                                            params.fullbalance = $scope.invoiceTotalDue;
                                            $scope.SyncPromise = $http({
                                                method: "post",
                                                url: basePath + "AuthorizePayment",
                                                datatype: "application/json",
                                                data: JSON.stringify(params)
                                            }).then(function (response) {
                                                if (response.status == 200) {
                                                    Response = response.data;
                                                    if (response.data !== "") {
                                                        if (Response.AuthorizePayment.Result.Status == "A") {
                                                            $scope.invoiceId = Response.AuthorizePayment.invoiceId;
                                                            //  alert("Payment processed succesfully");
                                                            //$scope.getReceiptImage();
                                                            $scope.completepayment = true;
                                                            $scope.updatePaymentStatus();
                                                        }
                                                        if (Response.AuthorizePayment.Result.Status == "U") {
                                                            alert("Unuathorized for AuthorizePayment");
                                                        }
                                                        if (Response.AuthorizePayment.Result.Status == "R") {
                                                            console.log(Response.AuthorizePayment.Result.Message);
                                                            $scope.paymenterror = "There was a problem processing your credit card, Please confirm your payment information or contact customer service at 1- 800 - 894 - 8570";
                                                            alert($scope.paymenterror);

                                                        }
                                                    } else
                                                        alert("Error Occurred - No Data returned");

                                                    ProcessPayment2();
                                                } else
                                                    alert(response.statusText);


                                            }, function () {
                                                alert("Error Occurred");
                                            })
                                        }
                                        if (Response.ConfirmCFAR.Result.Status == "U") {
                                            alert("Unuathorized for ConfirmCFAR");
                                        }
                                        if (Response.ConfirmCFAR.Result.Status == "R") {
                                            console.log(Response.ConfirmCFAR.Result.Message);
                                            $scope.BookingFineMsg = "There was a problem processing your credit card, Please confirm your payment information or contact us at 1-888-322-7057.";
                                            alert($scope.BookingFineMsg);

                                        }
                                    } else
                                        alert("Error Occurred - No Data returned");
                                } else
                                    alert(response.statusText);

                            }, function () {
                                alert("Error Occurred");
                            })


                        }
                        if (Response.ResChangeBookingStatusT2.Result.Status == "U") {
                            alert("Unuathorized for ChangeBookingStatusT2");
                        }
                        if (Response.ResChangeBookingStatusT2.Result.Status == "R") {
                            console.log(Response.ResChangeBookingStatusT2.Result.Message);
                            $scope.paymenterror = "There was a problem processing this booking.  " + Response.ResChangeBookingStatusT2.Result.Message;
                            alert($scope.paymenterror);
                            $scope.BookingSubmitted = 'False';
                            $scope.completepayment = false;
                            $scope.takepayment = false;
                            $scope.selRoom = undefined;
                            $scope.DepositZipCode = undefined;
                            $scope.DepositLastName = undefined;
                            $scope.DepositFirstName = undefined;
                            $scope.depositAmount = undefined;
                            $scope.GetAvailableRooms();

                            //$scope.GetAllData();

                        }
                    } else
                        alert("Error Occurred - No Data returned");
                } else
                    alert(response.statusText);

            }, function () {
                alert("Error Occurred");
            })
        }




    }
    $scope.updatePaymentStatus = function () {
        params = {};

        params.TentativeBookingookingID = $scope.tentativeBookingID;
        params.PaymentStatus = "Paid";

        $scope.SyncPromise = $http({
            method: "post",
            url: basePath + "UpdateTentativePaymentStatus",
            datatype: "application/json",
            data: JSON.stringify(params)
        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {
                    if (Response.UpdateTentativePaymentStatus.Result.Status == "A") {

                        alert("Payment status updated succesfully");

                    }
                    if (Response.UpdateTentativePaymentStatus.Result.Status == "U") {
                        alert("Unuathorized for UpdateTentativePaymentStatus");
                    }
                }
                else
                    alert("Error Occurred - No Data returned");
            }
            else
                alert(response.statusText);

        }, function () {
            alert("Error Occurred");
        })
    }

    $scope.SaveTentativeBooking = function () {
        params = {};
        params.CurrentCruiseCode = $scope.CurrentCruiseNum;
        params.NewBookingID = $scope.bookingId;

        params.FacilityID = $scope.ShipSel;

        for (a = 0; a < $scope.Ships.length; a++) {
            if ($scope.Ships[a].FacilityId == $scope.ShipSel)
                params.FacilityName = $scope.Ships[a].Name;
        }

        params.NewEventID = $scope.EventID;

        for (b = 0; b < $scope.Departures.length; b++) {
            if ($scope.Departures[b].EventId == $scope.EventID) {
                params.DepartureDate = $scope.Departures[b].BegDate;
                params.NewCruiseCode = $scope.Departures[b].Code;
            }

        }

        params.CategoryID = $scope.selCategory;
        if (params.CategoryID == undefined)
        //no category was selected - select based on room
        {
            //params.CategoryID = "1";
            //params.CategoryCode = "1";
            for (f = 0; f < $scope.AvailRoomList.length; f++) {
                if ($scope.AvailRoomList[f].UnitId == $scope.selRoom)
                    params.CategoryID = $scope.AvailRoomList[f].CategoryId;
            }
            for (g = 0; g < $scope.Categories.length; g++) {
                if ($scope.Categories[g].CategoryId == params.CategoryID)
                    params.CategoryCode = $scope.Categories[g].Code;
            }
        }
        else {
            for (c = 0; c < $scope.Categories.length; c++) {
                if ($scope.Categories[c].CategoryId == $scope.selCategory)
                    params.CategoryCode = $scope.Categories[c].Code;
            }
        }

        params.UnitID = $scope.selRoom;
        if (params.UnitID == undefined) {
            params.UnitID = "0";
            params.UnitCode = "0";
        }
        else {
            for (d = 0; d < $scope.AvailRoomList.length; d++) {
                if ($scope.AvailRoomList[d].UnitId == $scope.selRoom)
                    params.UnitCode = $scope.AvailRoomList[d].Code;
            }
            if (params.UnitCode == undefined) {
                params.UnitID = "0";
                params.UnitCode = "0";
            }
        }

        params.invoiceId = $scope.invoiceId;
        params.Paymentstatus = "Tentative";
        // params.Paymentstatus = "1";
        params.folioId1 = $scope.folio1;
        params.FullName1 = $scope.guest1name;

        params.folioId2 = $scope.folio2;
        params.FullName2 = $scope.guest2name;

        var optSelectedItemIds = [];
        if ($scope.optAirFairSelected != undefined) {
            optSelectedItemIds.push({
                "itemID": $scope.optAirFairSelected.ItemId
            });
        }
        if ($scope.optPreCruiseSelected != undefined) {
            optSelectedItemIds.push({
                "itemID": $scope.optPreCruiseSelected.ItemId
            });
        }
        if ($scope.optPostCruiseSelected != undefined) {
            optSelectedItemIds.push({
                "itemID": $scope.optPostCruiseSelected.ItemId
            });
        }
        if (Number.isInteger($scope.selCFAR)) {
            optSelectedItemIds.push({
                "itemID": $scope.selCFAR.toString()
            });
        }
        else {
            optSelectedItemIds.push({
                "itemID": $scope.selCFAR.replace(":M", "")
            });
        }
        params.AddItems = optSelectedItemIds;
        console.log("SaveTentativeBooking_params", params);
        $scope.SyncPromise = $http({
            method: "post",
            url: basePath + "SaveTentativeBooking",
            datatype: "application/json",
            data: JSON.stringify(params)
        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {
                    if (Response.SaveTentativeBooking.Result.Status == "A") {
                        $scope.tentativeBookingID = Response.SaveTentativeBooking.TemporaryBookingID;
                        $scope.takepayment = true;
                        $scope.completepayment = false;
                    }
                    if (Response.SaveTentativeBooking.Result.Status == "U") {
                        alert("Unuathorized for SaveTentativeBooking");
                    }
                }
                else
                    alert("Error Occurred - No Data returned");
            }
            else
                alert(response.statusText);

        }, function () {
            alert("Error Occurred");
        })
    }
    $scope.setemailsend = function (status) {
        $scope.emailOption = "{&quot;RECEIPT_URL&quot;:&quot;" + $scope.receiptPath + "rebuid=" + $scope.bookingId + "&quot;}";
        console.log("$scope.emailOption", $scope.emailOption);
        $scope.emailsend = status;
    }
    $scope.setemailsendReceipt = function (status) {
        $scope.emailOption = "{&quot;RECEIPT_URL&quot;:&quot;" + $scope.receiptPath + "rebuid=" + $scope.bookingId + "&quot;}";
        console.log("$scope.emailOption", $scope.emailOption);
        $scope.emailsendReceipt = status;
    }

    $scope.optAirFair = function (opt) {
        console.log("af", opt);
        $scope.optAirFairSelected = undefined;
        // $scope.optAirFairItemSelected = undefined;
        if (opt.Name != "Post Cruise Package Declined" && opt.Name != "Airfare Declined") {
            var item = {};
            item.ItemId = opt.ItemId;
            if (opt.RateList != null) {
                item.price = opt.RateList[0].Price;
            }
            else {
                item.price = 0.00;
            }
            item.quantity = $scope.numfolios;
            $scope.optAirFairSelected = item;
            console.log("optAirFairSelected", $scope.optAirFairSelected);

            // var itemid = {};
            // itemid.itemID = opt.ItemId;
            // $scope.optAirFairItemSelected = itemid;
            //console.log("optAirFairItemSelected", $scope.optAirFairItemSelected);
        }
        $scope.getCFAR();
    }

    $scope.optPreCruise = function (opt) {
        console.log("prec", opt);
        $scope.preCruiseOptSelected = true;
        $scope.optPreCruiseSelected = undefined;
        // $scope.optPreCruiseItemSelected = undefined;
        if (opt.Name != "Post Cruise Package Declined" && opt.Name != "Airfare Declined") {
            var item = {};
            item.ItemId = opt.ItemId;
            if (opt.RateList != null) {
                item.price = opt.RateList[0].Price;
            }
            else {
                item.price = 0.00;
            }
            item.quantity = $scope.numfolios;
            $scope.optPreCruiseSelected = item;
            console.log("optPreCruiseSelected", $scope.optPreCruiseSelected);

            // var itemid = {};
            // itemid.itemID = opt.ItemId;
            // $scope.optPreCruiseItemSelected = itemid;
            //console.log("optPreCruiseItemSelected", $scope.optPreCruiseItemSelected);
        }
        $scope.getCFAR();
    }

    $scope.optPostCruise = function (opt) {
        console.log("postc", opt);
        $scope.optPostCruiseSelected = undefined;
        // $scope.optPostCruiseItemSelected = undefined;
        if (
            opt.Name != "Post Cruise Package Declined" && opt.Name != "Airfare Declined") {
            var item = {};
            item.ItemId = opt.ItemId;
            if (opt.RateList != null) {
                item.price = opt.RateList[0].Price;
            }
            else {
                item.price = 0.00;
            }
            item.quantity = $scope.numfolios;
            $scope.optPostCruiseSelected = item;
            console.log("optPostCruiseSelected", $scope.optPostCruiseSelected);

            // var itemid = {};
            // itemid.itemID = opt.ItemId;
            // $scope.optPostCruiseItemSelected = itemid;
            //console.log("optPostCruiseItemSelected", $scope.optPostCruiseItemSelected);
        }
        $scope.getCFAR();
    }

    $scope.getCFAR = function () {
        //console.log("$scope.preoptselectedmodel", $scope.preoptselectedmodel);
        params = {};
        if ($scope.selCategory == undefined)
        //no category was selected - select based on room
        {
            if ($scope.selRoom != undefined) {
                for (f = 0; f < $scope.AvailRoomList.length; f++) {
                    if ($scope.AvailRoomList[f].UnitId == $scope.selRoom)
                        CategoryID = $scope.AvailRoomList[f].CategoryId;
                }
                for (g = 0; g < $scope.Categories.length; g++) {
                    if ($scope.Categories[g].CategoryId == CategoryID)
                        params.CategoryCode = $scope.Categories[g].Code;
                }
            }
            else
                params.CategoryCode = undefined;
        }
        else {

            for (c = 0; c < $scope.Categories.length; c++) {
                if ($scope.Categories[c].CategoryId == $scope.selCategory)
                    params.CategoryCode = $scope.Categories[c].Code;
            }
        }
        if (params.CategoryCode != undefined) {
            params.eventId = $scope.EventID;
            params.numfolios = $scope.numfolios;

            var optSelected = [];
            if ($scope.optAirFairSelected != undefined) {
                optSelected.push($scope.optAirFairSelected);
            }
            if ($scope.optPreCruiseSelected != undefined) {
                optSelected.push($scope.optPreCruiseSelected);
            }
            if ($scope.optPostCruiseSelected != undefined) {
                optSelected.push($scope.optPostCruiseSelected);
            }

            params.AddItems = optSelected;
            params.discountCode = "ONBOARD15";
            console.log("CFAR_params", params);
            $scope.SyncPromise = $http({
                method: "post",
                url: basePath + "GetCFAR",
                datatype: "application/json",
                data: JSON.stringify(params)
            }).then(function (response) {
                if (response.status == 200) {
                    Response = response.data;
                    if (response.data !== "") {
                        if (Response.GetCFAR.Result.Status == "A") {
                            $scope.CFAR = Response.GetCFAR.ItemList;

                            if ($scope.AddedItems != undefined) {
                                $scope.AddedItems.forEach(element => {
                                    $scope.CFAR.forEach(af => {
                                        if (element.opiitiuid.toString() == af.ItemId.toString().replace(":M", "")) {
                                            if (af.ItemId == 491)
                                                $scope.selCFAR = af.ItemId;
                                            else
                                                $scope.selCFAR = af.ItemId.toString() + ':M';

                                            if (typeof $scope.selCFAR === 'string' || $scope.selCFAR instanceof String) {
                                                if ($scope.selCFAR.includes(":")) {
                                                    $scope.deliverytype = $scope.selCFAR.substr($scope.selCFAR.indexOf(':') + 1, 1);
                                                }
                                            }
                                        }
                                    });
                                })
                            }
                        }
                        if (Response.GetCFAR.Result.Status == "U") {
                            alert("Unuathorized for GetCFAR");
                            $scope.CFAR = undefined;
                        }
                    }
                    else {
                        alert("Error Occurred - No Data returned");
                        $scope.CFAR = undefined;
                    }
                }
                else {
                    alert(response.statusText);
                    $scope.CFAR = undefined;
                }

            }, function () {
                alert("Error Occurred");
            })
        }
    }
    $scope.GetFoliosForEvent = function () {

        params = {};
        params.eventCode = $scope.CurrentCruiseNum;

        thejson = JSON.stringify(params);
        $scope.SyncPromise = $http({
            method: "post",
            url: basePath + "GetFoliosForEvent",
            datatype: "application/json",
            data: JSON.stringify(params)
        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {

                    if (Response.GetFoliosForEvent.Result.Status == "A") {
                        $scope.EventFolios = Response.GetFoliosForEvent.FolioList;

                    }
                    if (Response.GetFoliosForEvent.Result.Status == "U") {
                        alert("Unuathorized for GetFoliosForEvent");
                    }
                }
            }
            else
                alert(response.statusText);


        }, function () {
            alert("Error Occurred");
        })

    }
    $scope.GetItineraryDisplay = function () {

        $scope.Departures.forEach(dp => {
            if ($scope.EventID == dp.EventId) {
                var dashpos = dp.Name.indexOf("-");
                if (dashpos > -1)
                    var subname = dp.Name.substring(dashpos + 1);
                else {
                    dashpos = dp.Name.indexOf("–");
                    if (dashpos > -1)
                        var subname = dp.Name.substring(dashpos + 1);
                    else
                        var subname = dp.Name;
                }
                if ($scope.CruiseType.trim != 'ALL')
                    if ($scope.LandPackages != undefined && $scope.LandPackages.length > 0) {
                        var durcalc = dp.Duration + $scope.LandPackages[0].Duration;
                        $scope.ItineraryDisplay = subname + " - " + durcalc + " Nights";
                    }
                    else
                        $scope.ItineraryDisplay = subname + " - " + dp.Duration + " Nights";
                else
                    $scope.ItineraryDisplay = subname + " - " + dp.Duration + " Nights";
            }
        });
    }

    function ProcessPayment2() {
        if ($scope.splitPayment == "Yes") {
            $scope.runQ = true;
            var authData2 = {};
            authData2.clientKey = clientKey;
            authData2.apiLoginID = apiLoginID;

            var cardData2 = {};
            cardData2.cardNumber = document.getElementById("DepositCardNumber2").value;
            cardData2.month = document.getElementById("DepositExpirationMonth2").value;
            cardData2.year = document.getElementById("DepositExpirationYear2").value;
            cardData2.cardCode = document.getElementById("DepositCardAuthorizationCode2").value;
            cardData2.zip = document.getElementById("DepositZipCode2").value;
            var firstName2 = document.getElementById("DepositFirstName2").value
            var lastName2 = document.getElementById("DepositLastName2").value;
            $scope.zip2 = cardData2.zip;
            $scope.firstName2 = firstName2;
            $scope.lastName2 = lastName2;
            cardData2.fullName = firstName2 + " " + lastName2;
            cardData2.amount = document.getElementById("confirm_deposit2").value;

            var secureData2 = {};
            secureData2.authData = authData2;
            secureData2.cardData = cardData2;

            Accept.dispatchData(secureData2, responseHandler2);
        }
    }
    function responseHandler2(response) {
        try {
            if (response.messages.resultCode === "Error") {
                var i = 0;
                while (i < response.messages.message.length) {
                    console.log(
                        response.messages.message[i].code + ": " +
                        response.messages.message[i].text
                    );
                    i = i + 1;
                }
                for (var i = 0; i < response.messages.message.length; i++) {
                    switch (response.messages.message[i].code) {
                        case "E_WC_07":
                        case "E_WC_08":
                        case "E_WC_06":
                            alert("We have encountered an error processing your payment.  Please confirm your expiration date and resubmit, or contact us at 800-460-4518 for assistance.");
                            break;
                        case "E_WC_04":
                        case "E_WC_05":
                            alert("We have encountered an error processing your payment.  Please confirm your card information and resubmit, or contact us at 800-460-4518 for assistance.");
                            break;
                        case "E_WC_15":
                            alert("We have encountered an error processing your payment.  Please provide a valid CVV and resubmit, or contact us at 800-460-4518 for assistance.");
                            break;
                        case "E_WC_16":
                            alert("We have encountered an error processing your payment.  Please provide a valid Zip Code and resubmit, or contact us at 800-460-4518 for assistance.");
                            break;
                        case "E_WC_17":
                            alert("We have encountered an error processing your payment.  Please provide a valid first and last name for the card holder and resubmit, or contact us at 800-460-4518 for assistance.");
                            break;
                        default:
                            alert("We have encountered an error processing your payment.  Please confirm your card & billing information and resubmit, or contact us at 800-460-4518 for assistance.");
                            break;
                    }
                }

            } else {
                paymentFormUpdate2(response.opaqueData);
            }
            if ($scope.splitPayment == "Yes") {
                $scope.RequestBeddingUpdate();
                if ($scope.specialOccasion == "Yes") {
                    $scope.RequestUpdateSpecialOccassion();
                }
                if ($scope.travelfriends == "Yes") {
                    $scope.RequestUpdateTravellingWith();
                }
            }
        } catch (error) {
            console.log(error);
        }
    }
    function paymentFormUpdate2(opaqueData) {
        //  document.getElementById("dataDescriptor").value = opaqueData.dataDescriptor;
        //  document.getElementById("dataValue").value = opaqueData.dataValue;
        $scope.opaqueData2 = opaqueData.dataValue;
        // If using your own form to collect the sensitive data from the customer,
        // blank out the fields before submitting them to your server.
        $scope.DepositCardNumber2 = undefined;
        $scope.DepositExpirationMonth2 = undefined;
        $scope.DepositExpirationYear2 = undefined;
        $scope.DepositCardAuthorizationCode2 = undefined;
        //  document.getElementById("DepositZipCode").value = "";
        //  document.getElementById("DepositLastName").value = "";
        //  document.getElementById("DepositFirstName").value = "";
        //  document.getElementById("depositAmount").value = "";
        $scope.RecordPayment2();
        // document.getElementById("paymentForm").submit();
    }
    $scope.RecordPayment2 = function () {
        if (typeof $scope.selCFAR === 'string' || $scope.selCFAR instanceof String) {
            if ($scope.selCFAR.includes(":")) {
                var cfaritem = $scope.selCFAR.slice(0, $scope.selCFAR.indexOf(':'));
            }
            else
                var cfaritem = $scope.selCFAR;
        }
        else
            var cfaritem = $scope.selCFAR;
        if (cfaritem == 491) {
            params = {};
            params.authOnly = false;
            params.bookingId = $scope.bookingId;
            if ($scope.selfolio2 == 'Other')
                params.folioId = $scope.selFolioOther;
            else
                params.folioId = $scope.selfolio2;
            params.amt = $scope.depositAmount2;
            params.eventId = $scope.EventID;

            params.zip = $scope.zip2;
            params.firstName = $scope.firstName2;
            params.lastName = $scope.lastName2;

            params.opaqueDataVal = $scope.opaqueData2;
            params.fullbalance = $scope.invoiceTotalDue;
            $scope.SyncPromise = $http({
                method: "post",
                url: basePath + "AuthorizePayment",
                datatype: "application/json",
                data: JSON.stringify(params)
            }).then(function (response) {
                if (response.status == 200) {
                    Response = response.data;
                    if (response.data !== "") {
                        if (Response.AuthorizePayment.Result.Status == "A") {
                            $scope.invoiceId = Response.AuthorizePayment.invoiceId;
                            //  alert("Payment processed succesfully");
                            //$scope.getReceiptImage();
                            $scope.completepayment = true;
                            $scope.updatePaymentStatus();
                        }
                        if (Response.AuthorizePayment.Result.Status == "U") {
                            alert("Unuathorized for AuthorizePayment");
                        }
                        if (Response.AuthorizePayment.Result.Status == "R") {
                            console.log(Response.AuthorizePayment.Result.Message);
                            $scope.paymenterror = "There was a problem processing your credit card, Please confirm your payment information or contact customer service at 1- 800 - 894 - 8570";
                            alert($scope.paymenterror);

                        }
                    }
                    else
                        alert("Error Occurred - No Data returned");
                }
                else
                    alert(response.statusText);

            }, function () {
                alert("Error Occurred");
            })
        }
        else {
            //CFAR accepted - call to confirm CFAR and mark as deluxe
            //added logic to put in t2 status before trying to make payment
            params = {};
            params.authOnly = false;
            params.bookingId = $scope.bookingId;
            if ($scope.selfolio2 == 'Other')
                params.folioId = $scope.selFolioOther;
            else
                params.folioId = $scope.selfolio2;
            params.amt = $scope.depositAmount2;
            params.eventId = $scope.EventID;

            params.zip = $scope.zip2;
            params.firstName = $scope.firstName2;
            params.lastName = $scope.lastName2;

            params.opaqueDataVal = $scope.opaqueData2;
            params.fullbalance = $scope.invoiceTotalDue;
            $scope.SyncPromise = $http({
                method: "post",
                url: basePath + "AuthorizePayment",
                datatype: "application/json",
                data: JSON.stringify(params)
            }).then(function (response) {
                if (response.status == 200) {
                    Response = response.data;
                    if (response.data !== "") {
                        if (Response.AuthorizePayment.Result.Status == "A") {
                            $scope.invoiceId = Response.AuthorizePayment.invoiceId;
                            //  alert("Payment processed succesfully");
                            //$scope.getReceiptImage();
                            $scope.completepayment = true;
                            $scope.updatePaymentStatus();
                        }
                        if (Response.AuthorizePayment.Result.Status == "U") {
                            alert("Unuathorized for AuthorizePayment");
                        }
                        if (Response.AuthorizePayment.Result.Status == "R") {
                            console.log(Response.AuthorizePayment.Result.Message);
                            $scope.paymenterror = "There was a problem processing your credit card, Please confirm your payment information or contact customer service at 1- 800 - 894 - 8570";
                            alert($scope.paymenterror);

                        }
                    } else
                        alert("Error Occurred - No Data returned");
                } else
                    alert(response.statusText);

            }, function () {
                alert("Error Occurred");
            })
        }
    }

}])  