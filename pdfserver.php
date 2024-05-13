<?php


include("/var/www/settings/db_settings.php");
include("./app_settings.php");
  

if(isset($_POST['pdf']) && isset($_POST['allowaccess']))
{

  $pdf = $_POST['pdf'].".pdf";

  $allowaccess = $_POST['allowaccess'];
  if (strpos($_SERVER['HTTP_REFERER'] ,$errorpage)!== false && $allowaccess=="true")
  {
	//echo $pdf;
        //echo $allowaccess;
	//echo $_SERVER['HTTP_REFERER'];
	ini_set('zlib.output_compression','Off');
	header("Pragma: public");
	header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");
	header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
	header("Cache-Control: must-revalidate");
	header('Content-type: application/pdf');
	header('Content-Disposition: inline; filename="'.$pdf.'"');
	header('Content-Length: ' . filesize($filelocation.$pdf));
	readfile($filelocation.$pdf);
  }
  else{
    $error = true;
	header("Location: ".$errorpage);
  }
}
else
{
   $error=true;
   header("Location: ".$errorpage);
}

?>
