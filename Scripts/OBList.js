var app = angular.module("OnboardBookingApp", ['checklist-model',  'cgBusy']);



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
app.controller("OnboardBookingCtrl", ['$scope', '$document','$http', 'orderByFilter', '$timeout', '$q', '$filter','OnboardBooking_CONFIG','$window', function ($scope, $document,$http, orderBy, $timeout, $q, $filter,OnboardBooking_CONFIG,$window) {

     
    
    var aclBasePath = OnboardBooking_CONFIG.aclBasePath;
    var referrerComp = OnboardBooking_CONFIG.referrer;
    var testreferrerComp = OnboardBooking_CONFIG.testreferrer;
    var webreferrerComp = OnboardBooking_CONFIG.referrerWEB;
    $scope.devip = OnboardBooking_CONFIG.devip;
    $scope.officeip = OnboardBooking_CONFIG.officeip;
    var receiptPath = OnboardBooking_CONFIG.ReceiptPath;
	$scope.copyrightdate = new Date().getFullYear();

    $scope.maintenanceFlag = OnboardBooking_CONFIG.maintenanceFlag;
    $scope.maintenanceMsg = OnboardBooking_CONFIG.maintenanceMsg;


    $scope.isIE = function() {

        if (navigator.userAgent.indexOf('MSIE') !== -1 || navigator.appVersion.indexOf('Trident/') > 0)
        {
            $scope.isIE = true;
           
        }
        else 
            $scope.isIEreturn = false;
        

    }

  
   function urlParam (name) {
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results == null) {
            return null;
        }
        else {
            return decodeURI(results[1]) || 0;
        }
    }
  
    $scope.GetAllData = function()
     {
	//base64 encoded booking code
	//hash
       
        $scope.invalidbooking = "False";
        $scope.BookingSubmitted = "False";
        const queryString = window.location.search;
        //this code does not work with IE  - replaced with urlParam function above
        //const urlParams = new URLSearchParams(queryString);
        //const hash = urlParams.get('hash');

        //page must come from block page only
        var referrer = document.referrer;
        $scope.referrer = referrer;
  	//get user IP address
        $http({
            method: "get",
            datatype: "application/json",
            //data: JSON.stringify(params),
            url: "https://ipinfo.io/json"

        }).then(function (response) {
            Response = response.data;
            $scope.ipaddress = Response.ip;
            if (referrer != referrerComp && referrer != testreferrerComp && $scope.ipaddress != $scope.devip && $scope.ipaddress != $scope.officeip && referrer.indexOf(webreferrerComp)==-1) {
                $scope.invalidbooking = "True";
            }
            else {
                $scope.CurrentCruiseNum = urlParam('CruiseNum');


                $scope.GetAllTentativeBookings();
                }
        
             }, function () {
            alert("Error Occured");
        })
      }

    $scope.sortBy = function (propertyName) {
        $scope.reverse = (propertyName !== null && $scope.propertyName === propertyName)
            ? !$scope.reverse : false;
        $scope.propertyName = propertyName;
        $scope.ShipPersonnels = orderBy($scope.ShipPersonnels, $scope.propertyName, $scope.reverse);
    };

   
    $scope.GetAllTentativeBookings = function () {
 
        params = {};
        params.CurrentCruiseCode = $scope.CurrentCruiseNum;
        params.PaymentStatus = "";
      

        $http({
          method: "post",
            datatype: "application/json",
            data: JSON.stringify(params),
            url: aclBasePath + "GetTentativeBookings"

        }).then(function (response) {
            Response = response.data;
            if (Response.GetTentativeBookings.Result.Status == "A") {
                $scope.TentativeList = Response.GetTentativeBookings.OnboardBookingList;
                CombTentativeList = [];
                rowindex = 0;
                if ($scope.TentativeList.length == 1) {
                    //only 1 booking with 1 guest in list
                    i = 0;
                    CombTentativeItem = {};
                    CombTentativeItem.obbuid = $scope.TentativeList[i].obbuid;
                    CombTentativeItem.CurrentCruiseCode = $scope.TentativeList[i].CurrentCruiseCode;
                    CombTentativeItem.NewCruiseCode = $scope.TentativeList[i].NewCruiseCode;
                    CombTentativeItem.NewEventID = $scope.TentativeList[i].NewEventID;
                    CombTentativeItem.NewBookingID = $scope.TentativeList[i].NewBookingID;
                    CombTentativeItem.FacilityID = $scope.TentativeList[i].FacilityID;
                    CombTentativeItem.FacilityName = $scope.TentativeList[i].FacilityName;
                    CombTentativeItem.DepartureDate = $scope.TentativeList[i].DepartureDate;
                    CombTentativeItem.CategoryID = $scope.TentativeList[i].CategoryID;
                    CombTentativeItem.CategoryCode = $scope.TentativeList[i].CategoryCode;
                    CombTentativeItem.UnitID = $scope.TentativeList[i].UnitID;
                    CombTentativeItem.UnitCode = $scope.TentativeList[i].UnitCode;
                    CombTentativeItem.InvoiceID = $scope.TentativeList[i].InvoiceID;
                    CombTentativeItem.PaymentStatus = $scope.TentativeList[i].PaymentStatus;
                    CombTentativeItem.TentativeBookingID = $scope.TentativeList[i].TentativeBookingID;
                    CombTentativeItem.UnitCode = $scope.TentativeList[i].UnitCode;
                    CombTentativeItem.FolioId1 = $scope.TentativeList[i].FolioId;
                    CombTentativeItem.FolioId2 = undefined;
                    CombTentativeItem.FullName1 = $scope.TentativeList[i].FullName;
                    CombTentativeItem.FullName2 = undefined;
                    CombTentativeItem.rowindex = rowindex;
                    CombTentativeItem.CombinedName = $scope.TentativeList[i].FullName;
                    CombTentativeList.push(CombTentativeItem);
                    $scope.CombinedTentativeList = CombTentativeList;

                }
                else {

                    for (i = 0; i <= $scope.TentativeList.length - 1; i++) {

                        if ($scope.TentativeList[i + 1] != undefined && ($scope.TentativeList[i].NewBookingID == $scope.TentativeList[i + 1].NewBookingID)) {
                            CombTentativeItem = {};
                            CombTentativeItem.obbuid = $scope.TentativeList[i].obbuid;
                            CombTentativeItem.CurrentCruiseCode = $scope.TentativeList[i].CurrentCruiseCode;
                            CombTentativeItem.NewCruiseCode = $scope.TentativeList[i].NewCruiseCode;
                            CombTentativeItem.NewEventID = $scope.TentativeList[i].NewEventID;
                            CombTentativeItem.NewBookingID = $scope.TentativeList[i].NewBookingID;
                            CombTentativeItem.FacilityID = $scope.TentativeList[i].FacilityID;
                            CombTentativeItem.FacilityName = $scope.TentativeList[i].FacilityName;
                            CombTentativeItem.DepartureDate = $scope.TentativeList[i].DepartureDate;
                            CombTentativeItem.CategoryID = $scope.TentativeList[i].CategoryID;
                            CombTentativeItem.CategoryCode = $scope.TentativeList[i].CategoryCode;
                            CombTentativeItem.UnitID = $scope.TentativeList[i].UnitID;
                            CombTentativeItem.UnitCode = $scope.TentativeList[i].UnitCode;
                            CombTentativeItem.InvoiceID = $scope.TentativeList[i].InvoiceID;
                            CombTentativeItem.PaymentStatus = $scope.TentativeList[i].PaymentStatus;
                            CombTentativeItem.TentativeBookingID = $scope.TentativeList[i].TentativeBookingID;
                            CombTentativeItem.UnitCode = $scope.TentativeList[i].UnitCode;
                            CombTentativeItem.FolioId1 = $scope.TentativeList[i].FolioId;
                            CombTentativeItem.FolioId2 = $scope.TentativeList[i + 1].FolioId;
                            CombTentativeItem.FullName1 = $scope.TentativeList[i].FullName;
                            CombTentativeItem.FullName2 = $scope.TentativeList[i + 1].FullName;
                            CombTentativeItem.rowindex = rowindex;
                            CombTentativeItem.CombinedName = $scope.TentativeList[i].FullName + ", " + $scope.TentativeList[i + 1].FullName;
                            CombTentativeList.push(CombTentativeItem);
                            rowindex++;
                            i++;
                        }
                        else {
                            CombTentativeItem = {};
                            CombTentativeItem.obbuid = $scope.TentativeList[i].obbuid;
                            CombTentativeItem.CurrentCruiseCode = $scope.TentativeList[i].CurrentCruiseCode;
                            CombTentativeItem.NewCruiseCode = $scope.TentativeList[i].NewCruiseCode;
                            CombTentativeItem.NewEventID = $scope.TentativeList[i].NewEventID;
                            CombTentativeItem.NewBookingID = $scope.TentativeList[i].NewBookingID;
                            CombTentativeItem.FacilityID = $scope.TentativeList[i].FacilityID;
                            CombTentativeItem.FacilityName = $scope.TentativeList[i].FacilityName;
                            CombTentativeItem.DepartureDate = $scope.TentativeList[i].DepartureDate;
                            CombTentativeItem.CategoryID = $scope.TentativeList[i].CategoryID;
                            CombTentativeItem.CategoryCode = $scope.TentativeList[i].CategoryCode;
                            CombTentativeItem.UnitID = $scope.TentativeList[i].UnitID;
                            CombTentativeItem.UnitCode = $scope.TentativeList[i].UnitCode;
                            CombTentativeItem.InvoiceID = $scope.TentativeList[i].InvoiceID;
                            CombTentativeItem.PaymentStatus = $scope.TentativeList[i].PaymentStatus;
                            CombTentativeItem.TentativeBookingID = $scope.TentativeList[i].TentativeBookingID;
                            CombTentativeItem.UnitCode = $scope.TentativeList[i].UnitCode;
                            CombTentativeItem.FolioId1 = $scope.TentativeList[i].FolioId;
                            CombTentativeItem.FolioId2 = undefined;
                            CombTentativeItem.FullName1 = $scope.TentativeList[i].FullName;
                            CombTentativeItem.FullName2 = undefined;
                            CombTentativeItem.rowindex = rowindex;
                            CombTentativeItem.CombinedName = $scope.TentativeList[i].FullName;
                            CombTentativeList.push(CombTentativeItem);
                            rowindex++;
                        }
                    }
                    $scope.CombinedTentativeList = CombTentativeList;
                }
                       
            }
  	

        }, function () {
            alert("Error Occured");
        })
     
    }
    $scope.setemailsend = function (status)
    {
        $scope.emailsend = emailstatus = status;
    }
   
    $scope.getReceiptImage = function (bookingID) {
   //     $scope.ViewInvoice = function (bookingID, invoiceID) {
        params = {};

        // params.bookingId = "";
        params.bookingId = bookingID;
        params.bookingCode = "";
        params.invoiceId = "";
        params.LatestInvoiceInd = "1";
        $scope.SyncPromise = $http({
            method: "post",
            url: aclBasePath + "GetReceiptImage",
            datatype: "application/json",
            data: JSON.stringify(params)
        }).then(function (response) {
            if (response.status == 200) {
                Response = response.data;
                if (response.data !== "") {
                    if (Response.GetReceiptImage.Result.Status == "A") {
                        if (Response.GetReceiptImage.Booking.InvoiceList.length != 0) {
                            $scope.invoiceImage = Response.GetReceiptImage.Booking.InvoiceList[0].InvoiceImage;
                            
                        }

                        else
                            alert("No Invoice/Receipt available.");


                    }
                    if (Response.GetReceiptImage.Result.Status == "U") {
                        alert("Unuathorized for GetReceiptImage");
                    }
                }
            }
            else
                alert(response.statusText);

        }, function () {
            alert("Error Occured");
        })

    }
 
    $scope.displayInvoice = function (bookingID) {
   
        //window.open("OBInvoice.html?bookingID=" + bookingID, "_blank")

        window.open("https://" + receiptPath + "rebuid=" + bookingID, "_blank")
    }
    $scope.setupEmailReceipt = function () {
        currbookingId = urlParam('bookingID');
        $scope.InvType = urlParam('InvType');
        //$scope.getReceiptImage(currbookingId);
        $scope.emailOption = "{&quot;RECEIPT_URL&quot;:&quot;" + receiptPath + "rebuid=" + currbookingId + "&quot;}";
        console.log("$scope.emailOption", $scope.emailOption);
    }
    $scope.emailInvoice = function (bookingID, InvType) {
        window.open("OBInvoiceEmail.html?bookingID=" + bookingID + "&InvType=" + InvType, "_blank")
    }
   $scope.MakeFinalBooking = function (indexnum) {

       if ($scope.CombinedTentativeList[indexnum].FolioId2 == undefined)
           window.open("OBSelect?CurrentCruiseNum=" + $scope.CombinedTentativeList[indexnum].CurrentCruiseCode + "&guest1nm=" + $scope.CombinedTentativeList[indexnum].FullName1 + "&bookingid=" + $scope.CombinedTentativeList[indexnum].NewBookingID + "&folio1=" + $scope.CombinedTentativeList[indexnum].FolioId1 + "&FacilityID=" + $scope.CombinedTentativeList[indexnum].FacilityID + "&EventID=" + $scope.CombinedTentativeList[indexnum].NewEventID + "&CategoryID=" + $scope.CombinedTentativeList[indexnum].CategoryID + "&UnitID=" + $scope.CombinedTentativeList[indexnum].UnitID + "&obbuid=" + $scope.CombinedTentativeList[indexnum].obbuid, "_blank")
       else
           window.open("OBSelect?CurrentCruiseNum=" + $scope.CombinedTentativeList[indexnum].CurrentCruiseCode + "&guest1nm=" + $scope.CombinedTentativeList[indexnum].FullName1 + "&guest2nm=" + $scope.CombinedTentativeList[indexnum].FullName2 + "&bookingid=" + $scope.CombinedTentativeList[indexnum].NewBookingID + "&folio1=" + $scope.CombinedTentativeList[indexnum].FolioId1 + "&folio2=" + $scope.CombinedTentativeList[indexnum].FolioId2 + "&FacilityID=" + $scope.CombinedTentativeList[indexnum].FacilityID + "&EventID=" + $scope.CombinedTentativeList[indexnum].NewEventID + "&CategoryID=" + $scope.CombinedTentativeList[indexnum].CategoryID + "&UnitID=" + $scope.CombinedTentativeList[indexnum].UnitID + "&obbuid=" + $scope.CombinedTentativeList[indexnum].obbuid, "_blank")

     
    }
   


}])  