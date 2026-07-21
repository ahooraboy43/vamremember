#  VamRemember.ps1  —  یادآور اقساط وام
# ============================================================

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

Import-Module ImportExcel
Import-Module BurntToast

#  تنظیمات (Config)
# ============================================================

$Config = @{
    # Data
    ExcelFile          = "C:\Users\sp11\Desktop\وامها.xlsx"
    SheetName          = "1405"
    ExcelStartRow      = 2
    DueSoonDays        = 7
    PreviousMonthMinDay= 25
    PersianMonthDays   = 31

    # Main form
    FormWidth          = 420
    HeaderH            = 55
    CardH              = 35
    FooterH            = 55
    MinCardRows        = 4
    SumH               = 32
    MainOpacity        = 0.88
    MinFormHeight      = 260
    FormBottomPadding  = 15

    # Widget
    WidgetW            = 48
    WidgetH            = 90

    # Animation
    AnimSteps          = 12
    AnimDelay          = 16
    ShakeCount         = 6
    ShakeDelay         = 35

    # Fonts
    FontUi             = 'SG Kara'
    FontText           = 'Tahoma'
    FontEmoji          = 'Segoe UI Emoji'
    FontSizeSmall      = 9
    FontSizeNormal     = 10
    FontSizeLarge      = 12

    # Tray
    TrayTip            = 'یادآور اقساط وام'
    TrayIconSize       = 16
    TrayCircleInset    = 1
    TrayCircleSize     = 14
    TrayIconFontSize   = 8

    # Text
    AppTitle           = 'یادآور اقساط'
    EmptyExcelTitle    = 'خطا'
    EmptyExcelMessage  = 'فایل اکسل خالی است'
    CloseButtonText    = '✖ بستن'
    OpenExcelButtonText= '📗 باز کردن فایل اکسل'

    SupabaseUrl = "https://yfgyauzuzznlhradsrbo.supabase.co"
    SupabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZ3lhdXp1enpubGhyYWRzcmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NDIxOTMsImV4cCI6MjA5OTQxODE5M30.Mshjl3p-fJtkTuRSKP_3DhNe9IW7D6jv1C9pD_bv39A"
    SupabaseTable = "expenses"

}
$SupabaseUrl = $Config.SupabaseUrl
$SupabaseKey = $Config.SupabaseKey
$SupabaseKey.Split('.').Count
#  رنگ‌پالت (Colors)
# ============================================================
$Clr = @{
    BgDark      = [System.Drawing.Color]::FromArgb(30,  30,  30)
    BgCard      = [System.Drawing.Color]::FromArgb(40,  40,  40)
    Header      = [System.Drawing.Color]::FromArgb(180, 200,  0,  0)
    Accent      = [System.Drawing.Color]::FromArgb( 76, 199, 186)
    AccentAlpha = [System.Drawing.Color]::FromArgb( 50,  76, 199, 186)
    Danger      = [System.Drawing.Color]::FromArgb( 80, 150,  5,  5)
    DangerBtn   = [System.Drawing.Color]::FromArgb(120,  40, 40)
    Mid         = [System.Drawing.Color]::FromArgb( 80,  40, 40, 40)
    Low         = [System.Drawing.Color]::FromArgb( 60,  95, 95, 95)
    HeadetBtn   = [System.Drawing.Color]::FromArgb(255,   0, 71)
    White       = [System.Drawing.Color]::White
    Gainsboro   = [System.Drawing.Color]::Gainsboro
    Transparent = [System.Drawing.Color]::Transparent
    PayHover    = [System.Drawing.Color]::FromArgb( 76, 199, 186)   # hover روی دکمه پرداخت
    PayActive   = [System.Drawing.Color]::FromArgb( 76, 199, 186)   # دکمه پرداخت وقتی فرم باز است
    PayActiveBg = [System.Drawing.Color]::FromArgb( 55,  55, 55)    # پس‌زمینه active
    SumBg       = [System.Drawing.Color]::FromArgb( 25,  25, 25)    # پس‌زمینه ردیف جمع
    SumFg       = [System.Drawing.Color]::FromArgb( 76, 199, 186)   # رنگ متن جمع

    TrayYellow  = [System.Drawing.Color]::Gold
    Black        = [System.Drawing.Color]::Black
    TrayRed      = [System.Drawing.Color]::FromArgb(210, 40, 40)
    TrayBlue     = [System.Drawing.Color]::DeepSkyBlue
}
#  ابزارهای کمکی (Helpers)
# ============================================================
function Sync-SupabaseToExcel {
    try {
        $stream = [System.IO.File]::Open(
            $Config.ExcelFile,
            [System.IO.FileMode]::Open,
            [System.IO.FileAccess]::ReadWrite,
            [System.IO.FileShare]::None
        )
        $stream.Close()
    }
    catch {
        [System.Windows.Forms.MessageBox]::Show(
            "فایل اکسل باز است.`n`nلطفاً فایل وامها.xlsx را ببندید و دوباره برنامه را اجرا کنید.",
            "امکان بروزرسانی وجود ندارد",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        )
        return
    }
    try {
        $headers = @{
            apikey        = $Config.SupabaseKey
            Authorization = "Bearer $($Config.SupabaseKey)"
        }
        $uri = "$($Config.SupabaseUrl)/rest/v1/$($Config.SupabaseTable)?select=*&order=id.asc"
        $rows = Invoke-RestMethod `
            -Uri $uri `
            -Method Get `
            -Headers $headers
        if (-not $rows) {
            return
        }
        $package = Open-ExcelPackage -Path $Config.ExcelFile
        $sheet   = $package.Workbook.Worksheets[$Config.SheetName]
        if (-not $sheet) {
            Close-ExcelPackage $package -NoSave
            throw "شیت '$($Config.SheetName)' پیدا نشد."
        }

        $columnMap = @{
            id                = 1
            amount            = 2
            title             = 3
            due_day           = 4
            installment_count = 5
            farvardin         = 6
            ordibehesht       = 7
            khordad           = 8
            tir               = 9
            mordad            = 10
            shahrivar         = 11
            mehr              = 12
            aban              = 13
            azar              = 14
            dey               = 15
            bahman            = 16
            esfand            = 17
        }
        $excelIdRows = @{}
        for ($row = 3; $row -le $sheet.Dimension.End.Row; $row++) {
            $id = $sheet.Cells[$row,1].Value

            if ($null -ne $id -and "$id".Trim() -ne "") {
                $excelIdRows["$id"] = $row
            }
        }
$lastExpenseRow = ($excelIdRows.Keys |
    Where-Object { [int]$_ -ge 10000 -and [int]$_ -lt 20000 } |
    ForEach-Object { $excelIdRows[$_] } |
    Measure-Object -Maximum).Maximum

foreach ($item in $rows) {
    $id = "$($item.id)"

    if ($excelIdRows.ContainsKey($id)) {
        $excelRow = $excelIdRows[$id]
    }
    else {
        if ([int]$item.id -lt 10000) {
            $sheet.InsertRow(14, 1)
            $excelRow = 14
            $sheet.Row($excelRow).Height = $sheet.Row(15).Height
            for ($c = 1; $c -le 5; $c++) {
                $sheet.Cells[$excelRow,$c].StyleID = $sheet.Cells[15,$c].StyleID
            }
            foreach ($key in @($excelIdRows.Keys)) {
                if ($excelIdRows[$key] -ge 14) { $excelIdRows[$key]++ }
            }
            if ($lastExpenseRow -ge 14) { $lastExpenseRow++ }
        }
        elseif ([int]$item.id -lt 20000) {
            $copyRow  = $lastExpenseRow
            $excelRow = $copyRow + 1
            $sheet.InsertRow($excelRow, 1)
            $sheet.Row($excelRow).Height = $sheet.Row($copyRow).Height
            for ($c = 1; $c -le 5; $c++) {
                $sheet.Cells[$excelRow,$c].StyleID = $sheet.Cells[$copyRow,$c].StyleID
            }
            $lastExpenseRow++
            foreach ($key in @($excelIdRows.Keys)) {
                if ($excelIdRows[$key] -ge $excelRow) { $excelIdRows[$key]++ }
            }
        }
        else {
            $maxIncomeRow = ($excelIdRows.Keys |
                Where-Object { [int]$_ -ge 20000 } |
                ForEach-Object { $excelIdRows[$_] } |
                Measure-Object -Maximum).Maximum

            $copyRow  = if ($maxIncomeRow) { $maxIncomeRow } else { $sheet.Dimension.End.Row - 1 }
            $excelRow = $copyRow + 1
            $sheet.InsertRow($excelRow, 1)
            $sheet.Row($excelRow).Height = $sheet.Row($copyRow).Height
            for ($c = 1; $c -le 5; $c++) {
                $sheet.Cells[$excelRow,$c].StyleID = $sheet.Cells[$copyRow,$c].StyleID
            }
            foreach ($key in @($excelIdRows.Keys)) {
                if ($excelIdRows[$key] -ge $excelRow) { $excelIdRows[$key]++ }
            }
            if ($lastExpenseRow -ge $excelRow) { $lastExpenseRow++ }
        }

        $excelIdRows[$id] = $excelRow
    }


            foreach ($property in $columnMap.Keys) {
                $column = $columnMap[$property]
                $value  = $item.$property
                $cell   = $sheet.Cells[$excelRow,$column]

                if ("$value".Trim().ToUpper() -eq "CLOSE") {
                    $cell.Value = $null
                    $cell.StyleName = "Style 2"
                }
                
                else {
    $numericColumns = @(2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17)
    if ($column -in $numericColumns) {
        $parsed = 0.0
        if ([double]::TryParse("$value", [System.Globalization.NumberStyles]::Any,
            [System.Globalization.CultureInfo]::InvariantCulture, [ref]$parsed)) {
            $cell.Value = $parsed
        } else {
            $cell.Value = $value
        }
    } else {
        $cell.Value = $value
    }
}

            }
        }

        Close-ExcelPackage $package
    }
    catch {
        if ($package) {
            Close-ExcelPackage $package -NoSave
        }

        [System.Windows.Forms.MessageBox]::Show(
            "خطا در بروزرسانی اکسل:`n`n$($_.Exception.Message)",
            "خطا",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        )
    }
}
 # پایان function
# یکسان‌سازی حروف فارسی/عربی در متن.
function ConvertTo-PersianChars {
    param([string]$text)
    $text = $text -replace 'ي', 'ی'
    $text = $text -replace 'ك', 'ک'
    return $text
}

# دریافت تاریخ شمسی.
function Get-PersianDate {
    $pc  = [System.Globalization.PersianCalendar]::new()
    $now = Get-Date
    return @{
        Day        = $pc.GetDayOfMonth($now)
        MonthIndex = $pc.GetMonth($now)
    }
}

# دریافت نام ماه‌های شمسی.
function Get-MonthNames {
    return @(
        'فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور',
        'مهر','آبان','آذر','دی','بهمن','اسفند'
    )
}
# دریافت لیست وام‌ها از فایل اکسل
function Get-LoanList {
    param(
        [string]$ExcelFile,
        [string]$SheetName
    )
    
    $data = Import-Excel $ExcelFile `
        -WorksheetName $SheetName `
        -StartRow $Config.ExcelStartRow

    if (-not $data -or $data.Count -eq 0) {
        New-BurntToastNotification `
            -Text $Config.EmptyExcelTitle,$Config.EmptyExcelMessage

        return @()
    }

    $loans = @()

    foreach ($row in $data) {

        # حذف ردیف‌های کاملاً خالی
        if ([string]::IsNullOrWhiteSpace($row.title)) {
            continue
        }

        $loans += [PSCustomObject]@{

            id                  = $row.id
            amount              = $row.amount
            title               = ConvertTo-PersianChars $row.title
            due_day             = $row.due_day
            installment_count   = $row.installment_count

            farvardin           = $row.farvardin
            ordibehesht         = $row.ordibehesht
            khordad             = $row.khordad
            tir                 = $row.tir
            mordad              = $row.mordad
            shahrivar            = $row.shahrivar
            mehr                = $row.mehr
            aban                = $row.aban
            azar                = $row.azar
            dey                 = $row.dey
            bahman              = $row.bahman
            esfand              = $row.esfand

            note                = $row.note
        }
    }

    return $loans
}
#  خواندن داده‌ها (Data)
# ============================================================
# محاسبه اقساط فعال، نزدیک سررسید و معوق
function Get-DueSoon {

    param(
        $ExcelFile,
        $SheetName
    )

    $data = Get-SupabaseExpenses

    if (-not $data -or $data.Count -eq 0) {

        New-BurntToastNotification `
            -Text $Config.EmptyExcelTitle, $Config.EmptyExcelMessage

        return @()
    }

    $persian   = Get-PersianDate
    $today     = $persian.Day
    $monthIndex = $persian.MonthIndex

    $MonthMap = @{
        1  = 'farvardin'
        2  = 'ordibehesht'
        3  = 'khordad'
        4  = 'tir'
        5  = 'mordad'
        6  = 'shahrivar'
        7  = 'mehr'
        8  = 'aban'
        9  = 'azar'
        10 = 'dey'
        11 = 'bahman'
        12 = 'esfand'
    }

    $currentMonth = $MonthMap[$monthIndex]

    $prevMonthIndex = if ($monthIndex -eq 1) {
        12
    }
    else {
        $monthIndex - 1
    }

    $prevMonth = $MonthMap[$prevMonthIndex]

    $result = @()

    foreach ($row in $data) {

        $name          = "$($row.title)".Trim()
        $dueText       = "$($row.due_day)".Trim()
        $remainingText = "$($row.installment_count)".Trim()

        # اطلاعات ناقص
        if ([string]::IsNullOrWhiteSpace($name)) {
            continue
        }

        if ([string]::IsNullOrWhiteSpace($dueText)) {
            continue
        }

        # قسط تمام‌شده
        if (
            $remainingText -match '^\d+$' -and
            [int]$remainingText -eq 0
        ) {
            continue
        }

        $remainingInstallments = $null

        if ($remainingText -match '^\d+$') {
            $remainingInstallments = [int]$remainingText
        }

        $dueDay      = [int]$dueText
        $currentPaid = "$($row.$currentMonth)".Trim()
        $prevPaid    = "$($row.$prevMonth)".Trim()


        # ==========================================
        # بررسی ماه قبل
        # CLOSED یعنی در این ماه اصلاً قسط وجود ندارد
        # ==========================================

        if (
            $prevPaid -ne 'CLOSED' -and
            [string]::IsNullOrWhiteSpace($prevPaid) -and
            $dueDay -ge $Config.PreviousMonthMinDay
        ) {

            $daysLate =
                ($today + $Config.PersianMonthDays) - $dueDay

            $result += [PSCustomObject]@{
                id                    = $row.id
                Name                  = $name
                Amount                = $row.amount
                Days                  = -$daysLate
                MonthColumn           = $prevMonth
                RemainingInstallments = $remainingInstallments
            }

            continue
        }
        # ماه بعد — فقط اگه امروز نزدیک آخر ماه باشیم
$nextMonthIndex = if ($monthIndex -eq 12) { 1 } else { $monthIndex + 1 }
$nextMonth = $MonthMap[$nextMonthIndex]
$nextPaid  = "$($row.$nextMonth)".Trim()

$daysUntilNextDue = ($Config.PersianMonthDays - $today) + $dueDay

if ($nextPaid -ne 'CLOSED' -and
    [string]::IsNullOrWhiteSpace($nextPaid) -and
    $daysUntilNextDue -le $Config.DueSoonDays) {

    $result += [PSCustomObject]@{
        id                    = $row.id
        Name                  = $name
        Amount                = $row.amount
        Days                  = $daysUntilNextDue
        MonthColumn           = $nextMonth
        RemainingInstallments = $remainingInstallments
    }
}



        # ==========================================
        # بررسی ماه جاری
        # CLOSED یعنی در این ماه قسط وجود ندارد
        # ==========================================

        if (
            $currentPaid -ne 'CLOSED' -and
            [string]::IsNullOrWhiteSpace($currentPaid)
        ) {

            $days = $dueDay - $today

            if ($days -le $Config.DueSoonDays) {

                $result += [PSCustomObject]@{
                    id                    = $row.id
                    Name                  = $name
                    Amount                = $row.amount
                    Days                  = $days
                    MonthColumn           = $currentMonth
                    RemainingInstallments = $remainingInstallments
                }
            }
        }
    }

    return @(
        $result |
        Sort-Object { [int]$_.Days }
    )
}
#  انیمیشن‌ها (Animations)
# ============================================================

# اجرای انیمیشن ظاهرشدن فرم.
function Set-UiButtonStyle {
    param(
        [Parameter(Mandatory = $true)]
        [System.Windows.Forms.Button]$Button,

        [System.Drawing.Color]$BackColor = $Clr.BgCard,

        [System.Drawing.Color]$ForeColor = $Clr.White,

        [string]$FontName = $Config.FontUi,

        [float]$FontSize = $Config.FontSizeNormal
    )

    $Button.Font = New-Object System.Drawing.Font($FontName, $FontSize)
    $Button.ForeColor = $ForeColor
    $Button.BackColor = $BackColor
    $Button.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $Button.FlatAppearance.BorderSize = 0
    $Button.TabStop = $false
}

# اتصال رفتار Hover مشترک به یک کنترل.
function Add-UiHoverEffect {
    param(
        [Parameter(Mandatory = $true)]
        [System.Windows.Forms.Control]$Control,

        [Parameter(Mandatory = $true)]
        [System.Drawing.Color]$HoverColor,

        [Parameter(Mandatory = $true)]
        [System.Drawing.Color]$NormalColor
    )

    $target = $Control
    $hover  = $HoverColor
    $normal = $NormalColor

    $Control.Add_MouseEnter({
        $target.BackColor = $hover
    }.GetNewClosure())

    $Control.Add_MouseLeave({
        $target.BackColor = $normal
    }.GetNewClosure())
}

# نمایش و فعال‌سازی فرم اصلی.
function Show-MainForm {
    param(
        [Parameter(Mandatory = $true)]
        [System.Windows.Forms.Form]$Form,

        [double]$Opacity = $Config.MainOpacity
    )

    if ($Form.IsDisposed) { return }

    $Form.Show()
    $Form.WindowState = [System.Windows.Forms.FormWindowState]::Normal
    $Form.BringToFront()
    $Form.Activate()
    $Form.Opacity = $Opacity
}

function Invoke-FadeIn {
    param([System.Windows.Forms.Form]$Form, [double]$TargetOpacity = 0.88)
    $Form.Opacity = 0
    $step = $TargetOpacity / $Config.AnimSteps
    for ($i = 0; $i -le $Config.AnimSteps; $i++) {
        $Form.Opacity = [Math]::Min($i * $step, $TargetOpacity)
        [System.Windows.Forms.Application]::DoEvents()
        Start-Sleep -Milliseconds $Config.AnimDelay
    }
    $Form.Opacity = $TargetOpacity
}

# اجرای انیمیشن محوشدن فرم.
function Invoke-FadeOut {
    param([System.Windows.Forms.Form]$Form)
    $startOp = $Form.Opacity
    $step     = $startOp / $Config.AnimSteps
    for ($i = $Config.AnimSteps; $i -ge 0; $i--) {
        $Form.Opacity = [Math]::Max($i * $step, 0)
        [System.Windows.Forms.Application]::DoEvents()
        Start-Sleep -Milliseconds $Config.AnimDelay
    }
    $Form.Opacity = 0
}

# اجرای انیمیشن ورود فرم.
function Invoke-SlideIn {
    param([System.Windows.Forms.Form]$Form, [int]$FromX, [int]$ToX)
    $Form.Left = $FromX
    $stepX = ($ToX - $FromX) / $Config.AnimSteps
    for ($i = 0; $i -le $Config.AnimSteps; $i++) {
        $Form.Left = [int]($FromX + $i * $stepX)
        [System.Windows.Forms.Application]::DoEvents()
        Start-Sleep -Milliseconds $Config.AnimDelay
    }
    $Form.Left = $ToX
}

# اجرای افکت لرزش فرم.
function Invoke-Shake {
    param([System.Windows.Forms.Form]$Form)
    $origX = $Form.Left
    for ($i = 0; $i -lt $Config.ShakeCount; $i++) {
        $offset    = if ($i % 2 -eq 0) { 5 } else { -5 }
        $Form.Left = $origX + $offset
        [System.Windows.Forms.Application]::DoEvents()
        Start-Sleep -Milliseconds $Config.ShakeDelay
    }
    $Form.Left = $origX
}
#------------جمع باق مانده---------
# به‌روزرسانی مبلغ جمع اقساط.
function Update-Sum {

    param(
        [decimal]$Amount
    )

    if($null -eq $script:SumLabel){
        return
    }

    $start = [decimal]$script:SumLabel.Tag
    $end   = $start - $Amount

    $steps = 40

    for($i = 1; $i -le $steps; $i++){

        $value = $start - (($start - $end) * $i / $steps)

        $script:SumLabel.Text = "{0:N0} ریال" -f ([math]::Round($value))
        [System.Windows.Forms.Application]::DoEvents()

        Start-Sleep -Milliseconds 15
    }

    $script:SumLabel.Tag  = $end
    $script:SumLabel.Text = "{0:N0} ریال" -f $end
}
#--------------------------
function Get-SupabaseExpenses {

    $Url = "$SupabaseUrl/rest/v1/expenses_status?select=*"

    $key = $SupabaseKey.Trim()

    $Headers = @{
        "apikey" = $key
        "Authorization" = "Bearer $key"
    }
    return Invoke-RestMethod `
        -Uri $Url `
        -Headers $Headers `
        -Method Get
$response | ConvertTo-Json -Depth 10

}
function Update-SupabasePayment {
    param(
        [int]$Id,
        [string]$Column,
        [string]$Value,
        $NewInstallmentCount = $null
    )

    $Url = "$SupabaseUrl/rest/v1/expenses_status?id=eq.$Id"

    $Headers = @{
        apikey        = $SupabaseKey
        Authorization = "Bearer $SupabaseKey"
        Prefer = "return=representation"
    }

    # اول Hashtable
    $Body = @{}
    $Body[$Column] = $Value

    # در صورت نیاز، تعداد اقساط را هم آپدیت کن
if ($null -ne $NewInstallmentCount) {
    $Body['installment_count'] = [int]$NewInstallmentCount
    }

    # فقط یک بار تبدیل به JSON
    $JsonBody = $Body | ConvertTo-Json -Compress

    # ارسال واقعی UTF-8
    $Utf8Body = [System.Text.Encoding]::UTF8.GetBytes($JsonBody)

    Invoke-RestMethod `
        -Uri $Url `
        -Headers $Headers `
        -Method Patch `
        -ContentType "application/json; charset=utf-8" `
        -Body $Utf8Body
}

#------------------------------
function Add-ExcelExpenseRow {

    param(
        [int]$Id,
        [string]$Title,
        [long]$Amount,
        [int]$DueDay,
        [int]$InstallmentCount,
        [string]$Note,
        [string]$StartMonth,

        [ValidateSet("Installment", "Expense")]
        [string]$Type = "Installment"
    )

    $ExcelFile = $Config.ExcelFile
    $SheetName = $Config.SheetName

    $Months = @(
        "فروردین",
        "اردیبهشت",
        "خرداد",
        "تیر",
        "مرداد",
        "شهریور",
        "مهر",
        "آبان",
        "آذر",
        "دی",
        "بهمن",
        "اسفند"
    )

    $StartMonthIndex = [Array]::IndexOf($Months, $StartMonth)

    if ($StartMonthIndex -lt 0) {
        throw "ماه نامعتبر است: [$StartMonth]"
    }

    if (-not (Test-ExcelAvailable -ExcelFile $ExcelFile)) {
        throw "فایل اکسل باز است و امکان ذخیره وجود ندارد."
    }

    $Package = $null

    try {

        $Package = Open-ExcelPackage -Path $ExcelFile

        $Worksheet = $Package.Workbook.Worksheets[$SheetName]

        if ($null -eq $Worksheet) {
            throw "شیت [$SheetName] پیدا نشد."
        }

        # ==========================================
        # تعیین محل درج ردیف
        # ==========================================

        if ($Type -eq "Installment") {

            # قسط جدید همیشه ردیف 14
            $NewRow = 14

            # درج ردیف و کپی قالب از ردیف قبلی موجود
            $Worksheet.InsertRow(
                $NewRow,
                1,
                $NewRow + 1
            )
            $Worksheet.Row($NewRow).Height = $Worksheet.Row($NewRow - 1).Height
        }
        else {

            # هزینه جدید همیشه بعد از ردیف 24
            # یعنی در ردیف 25 درج می‌شود
            $NewRow = 25

            $Worksheet.InsertRow(
                $NewRow,
                1,
                24
            )
            $Worksheet.Row($NewRow).Height = $Worksheet.Row($NewRow - 1).Height
        }

        # ==========================================
        # اطلاعات مشترک
        # ==========================================

        # A = ID
        $Worksheet.Cells[$NewRow, 1].Value = $Id

        # C = عنوان
        $Worksheet.Cells[$NewRow, 3].Value = $Title

        # R = توضیح
        $Worksheet.Cells[$NewRow, 18].Value = $Note

        # ==========================================
        # قسط
        # ==========================================

        if ($Type -eq "Installment") {

            # B = مبلغ قسط
            $Worksheet.Cells[$NewRow, 2].Value = $Amount

            # D = روز سررسید
            $Worksheet.Cells[$NewRow, 4].Value = $DueDay

            # E = تعداد اقساط
            $Worksheet.Cells[$NewRow, 5].Value = $InstallmentCount

            # ماه‌ها F تا Q
            for ($i = 0; $i -lt 12; $i++) {

                $MonthColumn = 6 + $i

                if ($i -lt $StartMonthIndex) {

                    # مهم:
                    # در Excel نباید CLOSED نوشته شود
                    # فقط سلول خالی + Style 2
                    $Worksheet.Cells[$NewRow, $MonthColumn].Value = $null
                    $Worksheet.Cells[$NewRow, $MonthColumn].StyleName = "Style 2"
                }
                else {

                    # ماه شروع و بعد از آن خالی و قابل پرداخت
                    $Worksheet.Cells[$NewRow, $MonthColumn].Value = $null
                }
            }
        }

        # ==========================================
        # هزینه
        # ==========================================

        else {

            # ستون‌های مخصوص قسط برای هزینه خالی هستند
            $Worksheet.Cells[$NewRow, 2].Value = $null
            $Worksheet.Cells[$NewRow, 4].Value = $null
            $Worksheet.Cells[$NewRow, 5].Value = $null

            # ماه‌ها F تا Q
            for ($i = 0; $i -lt 12; $i++) {

                $MonthColumn = 6 + $i

                if ($i -lt $StartMonthIndex) {

                    # ماه‌های قبل از ماه هزینه:
                    # خالی + Style 2
                    $Worksheet.Cells[$NewRow, $MonthColumn].Value = $null
                    $Worksheet.Cells[$NewRow, $MonthColumn].StyleName = "Style 2"
                }
                else {

                    # ماه انتخابی و ماه‌های بعد خالی
                    $Worksheet.Cells[$NewRow, $MonthColumn].Value = $null
                }
            }

            # فقط ماه انتخاب‌شده مبلغ هزینه را می‌گیرد
            $ExpenseMonthColumn = 6 + $StartMonthIndex

            $Worksheet.Cells[
                $NewRow,
                $ExpenseMonthColumn
            ].Value = $Amount
        }

        # ==========================================
        # ذخیره
        # ==========================================

        Close-ExcelPackage $Package
        $Package = $null
    }
    catch {

        if ($null -ne $Package) {
            try {
                $Package.Dispose()
            }
            catch {
            }
        }

        throw
    }
}
#------------------------------------
#--------فرم ساخت ردیف جدید------------
function Show-NewExpenseForm {

    $form = New-Object System.Windows.Forms.Form
    $form.Text = "ایجاد ردیف جدید"
    $form.Size = New-Object System.Drawing.Size(420,560)
    $form.StartPosition = "CenterScreen"
    $form.RightToLeft = "Yes"
    $form.RightToLeftLayout = $true
    $form.BackColor = $Clr.bgDArk

    function Add-LabelBox {
        param(
            $text,
            $y
        )

        $lbl = New-Object System.Windows.Forms.Label
        $lbl.Text = $text
        $lbl.Location = New-Object System.Drawing.Point(300,$y)
        $lbl.Size = New-Object System.Drawing.Size(80,25)
        $lbl.ForeColor = $Clr.White
        $lbl.Font = New-Object System.Drawing.Font($Config.FontUi,10)
        $form.Controls.Add($lbl)

        $txt = New-Object System.Windows.Forms.TextBox
        $txt.Location = New-Object System.Drawing.Point(40,$y)
        $txt.Size = New-Object System.Drawing.Size(240,25)
        $txt.Font = New-Object System.Drawing.Font($Config.FontText,10)
        $form.Controls.Add($txt)

        return @{
            Label = $lbl
            TextBox = $txt
        }
    }

    # ==============================
    # نوع ردیف
    # ==============================

    $lblType = New-Object System.Windows.Forms.Label
    $lblType.Text = "نوع"
    $lblType.Location = New-Object System.Drawing.Point(300,30)
    $lblType.Size = New-Object System.Drawing.Size(80,25)
    $lblType.ForeColor = $Clr.White
    $lblType.Font = New-Object System.Drawing.Font($Config.FontUi,10)
    $form.Controls.Add($lblType)

    $cmbType = New-Object System.Windows.Forms.ComboBox
    $cmbType.Location = New-Object System.Drawing.Point(40,30)
    $cmbType.Size = New-Object System.Drawing.Size(240,25)
    $cmbType.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList

    [void]$cmbType.Items.Add("قسط")
    [void]$cmbType.Items.Add("هزینه")

    $cmbType.SelectedIndex = 0
    $form.Controls.Add($cmbType)

    # ==============================
    # فیلدها
    # ==============================

    $titleControl = Add-LabelBox "نام" 80
    $txtTitle = $titleControl.TextBox

    $amountControl = Add-LabelBox "مبلغ" 130
    $txtAmount = $amountControl.TextBox

    $dueControl = Add-LabelBox "روز سررسید" 180
    $txtDue = $dueControl.TextBox
    $lblDue = $dueControl.Label

    $countControl = Add-LabelBox "تعداد اقساط" 230
    $txtCount = $countControl.TextBox
    $lblCount = $countControl.Label

    # ==============================
    # ماه
    # ==============================

    $lblStartMonth = New-Object System.Windows.Forms.Label
    $lblStartMonth.Text = "ماه شروع"
    $lblStartMonth.Location = New-Object System.Drawing.Point(300,280)
    $lblStartMonth.Size = New-Object System.Drawing.Size(80,25)
    $lblStartMonth.ForeColor = $Clr.White
    $lblStartMonth.Font = New-Object System.Drawing.Font($Config.FontUi,10)
    $form.Controls.Add($lblStartMonth)

    $cmbStartMonth = New-Object System.Windows.Forms.ComboBox
    $cmbStartMonth.Location = New-Object System.Drawing.Point(40,280)
    $cmbStartMonth.Size = New-Object System.Drawing.Size(240,25)
    $cmbStartMonth.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList

    [void]$cmbStartMonth.Items.AddRange(@(
        "فروردین",
        "اردیبهشت",
        "خرداد",
        "تیر",
        "مرداد",
        "شهریور",
        "مهر",
        "آبان",
        "آذر",
        "دی",
        "بهمن",
        "اسفند"
    ))

    $pc = New-Object System.Globalization.PersianCalendar
    $currentMonthIndex = $pc.GetMonth((Get-Date)) - 1
    $cmbStartMonth.SelectedIndex = $currentMonthIndex

    $form.Controls.Add($cmbStartMonth)

    # ==============================
    # توضیح
    # ==============================

    $noteControl = Add-LabelBox "توضیح" 330
    $txtNote = $noteControl.TextBox

    # ==============================
    # دکمه ثبت
    # ==============================

    $btnSave = New-Object System.Windows.Forms.Button
    $btnSave.Text = "✔ ثبت قسط"
    $btnSave.Size = New-Object System.Drawing.Size(200,40)
    $btnSave.Location = New-Object System.Drawing.Point(100,420)
    $btnSave.BackColor = $Clr.Accent
    $btnSave.ForeColor = $Clr.White
    $btnSave.FlatStyle = "Flat"

    $form.Controls.Add($btnSave)

    # ==============================
    # تغییر رفتار فرم بر اساس نوع
    # ==============================

    $cmbType.Add_SelectedIndexChanged({

        $isExpense = ($cmbType.SelectedItem -eq "هزینه")

        if ($isExpense) {

            # هزینه سررسید و تعداد قسط ندارد
            $txtDue.Clear()
            $txtCount.Clear()

            $txtDue.Enabled = $false
            $txtCount.Enabled = $false

            $lblDue.ForeColor = [System.Drawing.Color]::Gray
            $lblCount.ForeColor = [System.Drawing.Color]::Gray

            $lblStartMonth.Text = "ماه هزینه"
            $btnSave.Text = "✔ ثبت هزینه"
            $form.Text = "ایجاد هزینه جدید"
        }
        else {

            $txtDue.Enabled = $true
            $txtCount.Enabled = $true

            $lblDue.ForeColor = $Clr.White
            $lblCount.ForeColor = $Clr.White

            $lblStartMonth.Text = "ماه شروع"
            $btnSave.Text = "✔ ثبت قسط"
            $form.Text = "ایجاد قسط جدید"
        }
    })

    # ==============================
    # ثبت
    # ==============================

    $btnSave.Add_Click({

        $isExpense = ($cmbType.SelectedItem -eq "هزینه")

        # نام و مبلغ برای هر دو نوع الزامی است
        if (
            [string]::IsNullOrWhiteSpace($txtTitle.Text) -or
            [string]::IsNullOrWhiteSpace($txtAmount.Text)
        ) {

            Show-NiceMessage `
                -Message "نام و مبلغ الزامی است" `
                -Title "خطا" `
                -Type "Warning"

            return
        }

        # بررسی مبلغ
        if (-not ($txtAmount.Text -match '^\d+$')) {

            Show-NiceMessage `
                -Message "مبلغ باید عدد باشد" `
                -Title "خطا" `
                -Type "Warning"

            $txtAmount.Focus()
            return
        }

        # فقط برای قسط
        if (-not $isExpense) {

            if (
                [string]::IsNullOrWhiteSpace($txtDue.Text) -or
                [string]::IsNullOrWhiteSpace($txtCount.Text)
            ) {

                Show-NiceMessage `
                    -Message "روز سررسید و تعداد اقساط برای قسط الزامی است" `
                    -Title "خطا" `
                    -Type "Warning"

                return
            }

            if (-not ($txtDue.Text -match '^\d+$')) {

                Show-NiceMessage `
                    -Message "روز سررسید باید عدد باشد" `
                    -Title "خطا" `
                    -Type "Warning"

                $txtDue.Focus()
                return
            }

            $dueDay = [int]$txtDue.Text

            if ($dueDay -lt 1 -or $dueDay -gt 31) {

                Show-NiceMessage `
                    -Message "روز سررسید باید بین 1 تا 31 باشد" `
                    -Title "خطا" `
                    -Type "Warning"

                $txtDue.Focus()
                return
            }

            if (-not ($txtCount.Text -match '^\d+$')) {

                Show-NiceMessage `
                    -Message "تعداد اقساط باید عدد باشد" `
                    -Title "خطا" `
                    -Type "Warning"

                $txtCount.Focus()
                return
            }
        }

        if (-not (Test-ExcelAvailable -ExcelFile $Config.ExcelFile)) {

            Show-NiceMessage `
                -Message "فایل اکسل باز است. لطفاً آن را ببندید و دوباره روی ثبت بزنید." `
                -Title "اکسل باز است" `
                -Type "Warning"

            return
        }

        # نوع داخلی
        $rowType = if ($isExpense) {
            "Expense"
        }
        else {
            "Installment"
        }

        # برای هزینه، DueDay و Count مقدار 0 می‌گیرند
        # تابع بعدی آن‌ها را در Supabase و Excel به NULL تبدیل می‌کند
        $form.Tag = [PSCustomObject]@{
            Title      = $txtTitle.Text.Trim()
            Amount     = [long]$txtAmount.Text
            DueDay     = if ($isExpense) { 0 } else { [int]$txtDue.Text }
            Count      = if ($isExpense) { 0 } else { [int]$txtCount.Text }
            Note       = $txtNote.Text.Trim()
            StartMonth = $cmbStartMonth.SelectedItem.ToString()
            Type       = $rowType
        }

        $form.DialogResult = [System.Windows.Forms.DialogResult]::OK
    })

    $result = $form.ShowDialog()

    if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
        return $form.Tag
    }

    return $null
}
#-------------------------------------
# ساخت قسط جدید در Supabase و Excel
function New-SupabaseExpense {

    param(
        [string]$Title,
        [long]$Amount,
        [int]$DueDay,
        [int]$InstallmentCount,
        [string]$Note,
        [string]$StartMonth,

        [ValidateSet("Installment", "Expense")]
        [string]$Type = "Installment"
    )

    $Url = "$SupabaseUrl/rest/v1/expenses"

    $Headers = @{
        apikey        = $SupabaseKey
        Authorization = "Bearer $SupabaseKey"
        Prefer        = "return=representation"
    }

    # ==========================================
    # ماه‌های فارسی و ستون‌های Supabase
    # ==========================================

    $Months = @(
        @{ Persian = 'فروردین';  Column = 'farvardin'   }
        @{ Persian = 'اردیبهشت'; Column = 'ordibehesht' }
        @{ Persian = 'خرداد';    Column = 'khordad'     }
        @{ Persian = 'تیر';      Column = 'tir'         }
        @{ Persian = 'مرداد';    Column = 'mordad'      }
        @{ Persian = 'شهریور';   Column = 'shahrivar'   }
        @{ Persian = 'مهر';      Column = 'mehr'        }
        @{ Persian = 'آبان';     Column = 'aban'        }
        @{ Persian = 'آذر';      Column = 'azar'        }
        @{ Persian = 'دی';       Column = 'dey'         }
        @{ Persian = 'بهمن';     Column = 'bahman'      }
        @{ Persian = 'اسفند';    Column = 'esfand'      }
    )

    # ==========================================
    # پیدا کردن ماه انتخاب‌شده
    # ==========================================

    $StartMonthIndex = -1

    for ($i = 0; $i -lt $Months.Count; $i++) {

        if ($Months[$i].Persian -eq $StartMonth) {
            $StartMonthIndex = $i
            break
        }
    }

    if ($StartMonthIndex -eq -1) {
        throw "ماه نامعتبر است: [$StartMonth]"
    }

    # ==========================================
    # پیدا کردن ID جدید
    #
    # قسط:
    # ID کمتر از 10000
    # Max + 1
    #
    # هزینه:
    # ID از 10000 به بعد
    # Max + 1
    # ==========================================

if ($Type -eq "Expense") {

    $IdQueryUrl = "$SupabaseUrl/rest/v1/expenses?select=id&id=gte.10000&order=id.desc&limit=1"

    $ExistingRows = @(
        Invoke-RestMethod `
            -Uri $IdQueryUrl `
            -Headers $Headers `
            -Method Get
    )

    if ($ExistingRows.Count -eq 0) {
        $NewId = 10000
    }
    else {
        $NewId = ([int]$ExistingRows[0].id) + 1
    }
}
else {

    $IdQueryUrl = "$SupabaseUrl/rest/v1/expenses?select=id&id=lt.10000&order=id.desc&limit=1"

    $ExistingRows = @(
        Invoke-RestMethod `
            -Uri $IdQueryUrl `
            -Headers $Headers `
            -Method Get
    )

    if ($ExistingRows.Count -eq 0) {
        $NewId = 1
    }
    else {
        $NewId = ([int]$ExistingRows[0].id) + 1
    }
}

    # ==========================================
    # ساخت اطلاعات اصلی
    # ==========================================

    $Body = @{
        id    = $NewId
        title = $Title
        note  = $Note
    }

    # ==========================================
    # هزینه
    # ==========================================

    if ($Type -eq "Expense") {

        # هزینه مبلغ ثابت قسط ندارد
        $Body["amount"] = $null

        # هزینه سررسید ندارد
        $Body["due_day"] = $null

        # هزینه تعداد قسط ندارد
        $Body["installment_count"] = $null

        # همه ماه‌ها CLOSED
        for ($i = 0; $i -lt $Months.Count; $i++) {

            $ColumnName = $Months[$i].Column
            $Body[$ColumnName] = "CLOSED"
        }

        # فقط ماه انتخاب‌شده شامل مبلغ واقعی هزینه است
        $ExpenseColumn = $Months[$StartMonthIndex].Column

        $Body[$ExpenseColumn] = $Amount
    }

    # ==========================================
    # قسط
    # ==========================================

    else {

        $Body["amount"] = $Amount
        $Body["due_day"] = $DueDay
        $Body["installment_count"] = $InstallmentCount

        # ماه‌های قبل از شروع = CLOSED
        # ماه شروع و ماه‌های بعد = NULL

        for ($i = 0; $i -lt $Months.Count; $i++) {

            $ColumnName = $Months[$i].Column

            if ($i -lt $StartMonthIndex) {
                $Body[$ColumnName] = "CLOSED"
            }
            else {
                $Body[$ColumnName] = $null
            }
        }
    }

    # ==========================================
    # تبدیل به JSON
    # ==========================================

    $JsonBody = $Body | ConvertTo-Json -Compress
    $Utf8Body = [System.Text.Encoding]::UTF8.GetBytes($JsonBody)

    try {

        # ======================================
        # ثبت در Supabase
        # ======================================

        $Result = Invoke-RestMethod `
            -Uri $Url `
            -Headers $Headers `
            -Method Post `
            -ContentType "application/json; charset=utf-8" `
            -Body $Utf8Body

        if ($null -eq $Result) {
            throw "Supabase result is null"
        }

        # ======================================
        # ثبت همان ردیف در Excel
        # ======================================

        Add-ExcelExpenseRow `
            -Id $NewId `
            -Title $Title `
            -Amount $Amount `
            -DueDay $DueDay `
            -InstallmentCount $InstallmentCount `
            -Note $Note `
            -StartMonth $StartMonth `
            -Type $Type

        return $Result
    }
    catch {

        if ($null -ne $_.Exception.Response) {

            try {

                $responseStream = `
                    $_.Exception.Response.GetResponseStream()

                if ($null -ne $responseStream) {

                    $reader = New-Object `
                        System.IO.StreamReader($responseStream)

                    $errorBody = $reader.ReadToEnd()
                    $reader.Dispose()

                    if (
                        -not [string]::IsNullOrWhiteSpace($errorBody)
                    ) {

                    }
                }
            }
            catch {
            }
        }

        throw
    }
}
#  انیمیشن‌ها (Animations)
# ============================================================

# اجرای انیمیشن ظاهرشدن فرم.
function Update-ExcelPayment {

param(
    [int]$Id,
    [string]$Column,
    [string]$Value,
    $NewInstallmentCount = $null
)
    $ExcelMonthMap = @{
    farvardin   = 'فروردین'
    ordibehesht = 'اردیبهشت'
    khordad     = 'خرداد'
    tir         = 'تیر'
    mordad      = 'مرداد'
    shahrivar   = 'شهریور'
    mehr        = 'مهر'
    aban        = 'آبان'
    azar        = 'آذر'
    dey         = 'دی'
    bahman      = 'بهمن'
    esfand      = 'اسفند'
}

    $ExcelColumnName = $ExcelMonthMap[$Column]

    if($null -eq $ExcelColumnName){
        throw "ستون ماه برای $Column تعریف نشده است"
    }
    $excel = Open-ExcelPackage -Path $Config.ExcelFile

if($null -eq $excel){
    throw "Excel package is null"
}
    try {

        $ws = $excel.Workbook.Worksheets[$Config.SheetName]

        $idColumn = 1
        $targetRow = $null

        # پیدا کردن ID
        for($r = 3; $r -le $ws.Dimension.Rows; $r++){

            if([int]$ws.Cells[$r,$idColumn].Value -eq $Id){

                $targetRow = $r
                break
            }
        }


        if($null -eq $targetRow){
            throw "ID $Id در اکسل پیدا نشد"
        }


        # پیدا کردن ستون ماه
        $targetColumn = $null

        for($c = 1; $c -le $ws.Dimension.Columns; $c++){

            if(
    $ws.Cells[2,$c].Text.Trim() -eq $ExcelColumnName
){
                $targetColumn = $c
                break
            }
        }


        if($null -eq $targetColumn){
            throw "ستون $Column پیدا نشد"
        }


        # ثبت پرداخت
        $ws.Cells[$targetRow,$targetColumn].Value = $Value
        # آپدیت تعداد اقساط باقی مانده
if($null -ne $NewInstallmentCount){

    $installmentColumn = $null

    for($c = 1; $c -le $ws.Dimension.Columns; $c++){

        if(
            $ws.Cells[2,$c].Text.Trim() -eq 'تعداد اقساط'
        ){
            $installmentColumn = $c
            break
        }
    }


    if($null -ne $installmentColumn){

        $ws.Cells[$targetRow,$installmentColumn].Value = 
            $NewInstallmentCount
    }
}

        Close-ExcelPackage $excel

    }
    catch {

        if($null -ne $excel){
            Close-ExcelPackage $excel -NoSave
        }

        throw $_
    }
}
#-----------جدول پراخت--------

# جدول پرداخت.
function Add-SupabasePaymentHistory {

    param(
        [int]$ExpenseId,
        [string]$MonthColumn,
        [string]$Note,
        [decimal]$Amount
    )

    $Url = "$SupabaseUrl/rest/v1/payment_history"

$Headers = @{
    apikey        = $SupabaseKey
    Authorization = "Bearer $SupabaseKey"
    "Content-Type" = "application/json"
    Prefer        = "return=minimal"
}

    $Body = @{
        expense_id   = $ExpenseId
        month_column = $MonthColumn
        note         = $Note
        amount       = $Amount
    }

    $Json = $Body | ConvertTo-Json -Compress

    Invoke-RestMethod `
        -Uri $Url `
        -Headers $Headers `
        -Method Post `
        -Body ([System.Text.Encoding]::UTF8.GetBytes($Json))
}
#-----------حذف ردیف به چپ--------

# حذف نمایشی کارت قسط.
function Invoke-CardRemove {

    param(
        [System.Windows.Forms.Panel]$Card,
        [decimal]$Amount
    )

    # حرکت کارت به چپ
    for($i=0; $i -lt 30; $i++){

        $Card.top -= 1

        [System.Windows.Forms.Application]::DoEvents()

        Start-Sleep -Milliseconds 8
    }

    # پنل والد را نگه می‌داریم
    $parent = $Card.Parent

    # حذف کارت
    $parent.Controls.Remove($Card)

    # مرتب کردن مجدد کارت‌ها
    $y = 5

    foreach($ctrl in $parent.Controls){

        if($ctrl -is [System.Windows.Forms.Panel]){

            while($ctrl.Top -gt $y){

    $ctrl.Top -= 3

    if($ctrl.Top -lt $y){
        $ctrl.Top = $y
    }

    [System.Windows.Forms.Application]::DoEvents()

    Start-Sleep -Milliseconds 5
}

            $y += $Config.CardH
        }

    }

    Update-Sum -Amount $Amount
    # انیمیشن حذف

    # Remove()

    # جابه‌جایی کارت‌های پایین

    # کم کردن مبلغ جمع
}

# ============================================================
#  وضعیت دکمه پرداخت
#  Tag = $false  → default   (سفید)
#  Tag = $true   → active    (فیروزه‌ای، فرم پرداخت باز است)
#  hover فقط وقتی Tag=false اعمال می‌شود
# ============================================================

# اعمال حالت عادی دکمه پرداخت.
function Set-PayBtnDefault {
    param([System.Windows.Forms.Button]$Btn)
    $Btn.Tag      = $false
    $Btn.ForeColor = $Clr.White
    $Btn.BackColor = $Clr.BgCard
}

# اعمال حالت فعال دکمه پرداخت.
function Set-PayBtnActive {
    param([System.Windows.Forms.Button]$Btn)
    $Btn.Tag      = $true
    $Btn.ForeColor = $Clr.PayActive
    $Btn.BackColor = $Clr.PayActiveBg
}
#  ویجت کوچک (Widget)
# ============================================================

# ساخت ویجت کوچک برنامه.
function New-MiniWidget {

    param(
        $Screen,
        [bool]$HasOverdue,
        [System.Windows.Forms.Form]$MainForm
    )
    # ساخت فرم ویجت
    # ========================================================

    $widget                 = New-Object System.Windows.Forms.Form
    $widget.FormBorderStyle = 'None'
    $widget.TopMost         = $true
    $widget.ShowInTaskbar   = $false
    $widget.Size            = New-Object System.Drawing.Size(
        $Config.WidgetW,
        $Config.WidgetH
    )
    $widget.BackColor       = [System.Drawing.Color]::FromArgb(30, 30, 30)
    $widget.Opacity         = 0.92
    $widget.StartPosition   = 'Manual'

    $widget.Location = New-Object System.Drawing.Point(
        ($Screen.Right - $Config.WidgetW),
        ([int]($Screen.Height / 6 - $Config.WidgetH / 6))
    )
    # نوار رنگی بالا
    # ========================================================

    $stripe           = New-Object System.Windows.Forms.Panel
    $stripe.Size      = New-Object System.Drawing.Size($Config.WidgetW, 4)
    $stripe.Location  = New-Object System.Drawing.Point(0, 0)
    $stripe.BackColor = if ($HasOverdue) {
        $Clr.Header
    }
    else {
        $Clr.Accent
    }

    $widget.Controls.Add($stripe)
    # آیکون
    # ========================================================

    $ico           = New-Object System.Windows.Forms.Label
    $ico.Text      = if ($HasOverdue) { '⚠' } else { '💳' }
    $ico.Font      = New-Object System.Drawing.Font('Segoe UI Emoji', 16)
    $ico.ForeColor = if ($HasOverdue) {
        [System.Drawing.Color]::FromArgb(255, 120, 60)
    }
    else {
        $Clr.Accent
    }

    $ico.BackColor = $Clr.Transparent
    $ico.Size      = New-Object System.Drawing.Size($Config.WidgetW, 44)
    $ico.Location  = New-Object System.Drawing.Point(0, 8)
    $ico.TextAlign = 'MiddleCenter'

    $widget.Controls.Add($ico)
    # اطلاعات موردنیاز Update-MiniWidget
    # ========================================================

    $widget.Tag = @{
        Stripe = $stripe
        Icon   = $ico
    }
    # برچسب
    # ========================================================

    $lbl           = New-Object System.Windows.Forms.Label
    $lbl.Text      = 'اقساط'
    $lbl.Font      = New-Object System.Drawing.Font($Config.FontText, $Config.FontSizeSmall)
    $lbl.ForeColor = $Clr.Gainsboro
    $lbl.BackColor = $Clr.Transparent
    $lbl.Size      = New-Object System.Drawing.Size($Config.WidgetW, 18)
    $lbl.Location  = New-Object System.Drawing.Point(0, 54)
    $lbl.TextAlign = 'MiddleCenter'

    $widget.Controls.Add($lbl)
    # Cursor
    # ========================================================

    $widget.Cursor = [System.Windows.Forms.Cursors]::Hand

    foreach ($c in $widget.Controls) {
        $c.Cursor = [System.Windows.Forms.Cursors]::Hand
    }
    # Hover
    # ========================================================

    $w = $widget

    $widget.Add_MouseEnter({
        $w.BackColor = [System.Drawing.Color]::FromArgb(50, 50, 50)
    }.GetNewClosure())

    $widget.Add_MouseLeave({
        $w.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 30)
    }.GetNewClosure())
    # کلیک چپ → نمایش فرم اصلی
    # ========================================================

    $capturedMain = $MainForm
    $capturedW    = $widget

    $restoreAction = {

        $capturedW.Hide()

        if (
            $null -ne $capturedMain -and
            -not $capturedMain.IsDisposed
        ) {
            $capturedMain.Show()
            $capturedMain.BringToFront()
            $capturedMain.Activate()
            $capturedMain.Opacity = 0.88
        }

    }.GetNewClosure()

# فقط کلیک چپ فرم را باز کند
$openMainForm = {
    param($sender, $e)

    if ($e.Button -ne [System.Windows.Forms.MouseButtons]::Left) {
        return
    }

    $capturedW.Hide()

    if ($null -ne $capturedMain -and -not $capturedMain.IsDisposed) {
        $capturedMain.Show()
        $capturedMain.BringToFront()
        $capturedMain.Activate()
        $capturedMain.Opacity = 0.88
    }

}.GetNewClosure()

# اتصال به خود ویجت و اجزای آن
foreach ($control in @($widget, $stripe, $ico, $lbl)) {
    $control.Add_MouseClick($openMainForm)
}
# Drag عمودی MiniWidget با کلیک راست
# ============================================================

$capturedW      = $widget
$capturedScreen = $Screen

$dragState = @{
    Active   = $false
    StartY   = 0
    StartTop = 0
}

$dragTimer = New-Object System.Windows.Forms.Timer
$dragTimer.Interval = 10

$dragTimer.Add_Tick({

    if (-not $dragState.Active) {
        return
    }

    # اگر کلیک راست رها شد
    if (
        ([System.Windows.Forms.Control]::MouseButtons -band
         [System.Windows.Forms.MouseButtons]::Right) -eq 0
    ) {
        $dragState.Active = $false
        $dragTimer.Stop()
        return
    }

    $currentY = [System.Windows.Forms.Cursor]::Position.Y
    $deltaY   = $currentY - $dragState.StartY
    $newTop   = $dragState.StartTop + $deltaY

    $minTop = $capturedScreen.Top
    $maxTop = $capturedScreen.Bottom - $capturedW.Height

    if ($newTop -lt $minTop) { $newTop = $minTop }
    if ($newTop -gt $maxTop) { $newTop = $maxTop }

    $capturedW.Top  = [int]$newTop
  #  $capturedW.Left = $capturedScreen.Right - $capturedW.Width

}.GetNewClosure())

$dragDown = {
    param($sender, $e)

    if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Right) {

        $dragState.StartY   = [System.Windows.Forms.Cursor]::Position.Y
        $dragState.StartTop = $capturedW.Top
        $dragState.Active   = $true

        $dragTimer.Start()
    }
}.GetNewClosure()

foreach ($control in @($widget, $stripe, $ico, $lbl)) {
    $control.Add_MouseDown($dragDown)
}

# مهم: Timer را زنده نگه می‌داریم
$widget.Tag.DragTimer = $dragTimer
$widget.Tag.DragState = $dragState

    return $widget
}
# به‌روزرسانی وضعیت ویجت.
# ============================================================
function Update-MiniWidget {
    param(
        [System.Windows.Forms.Form]$Widget,
        [array]$Soon
    )

    if ($null -eq $Widget -or $Widget.IsDisposed) { return }
    if ($null -eq $Widget.Tag) { return }

    $Stripe = $Widget.Tag.Stripe
    $Icon   = $Widget.Tag.Icon

    $OverdueCount = @(
        $Soon | Where-Object { [int]$_.Days -lt 0 }
    ).Count

    $SoonCount = @(
        $Soon | Where-Object { [int]$_.Days -ge 0 }
    ).Count

    if ($OverdueCount -gt 0) {
        # قرمز
        $Stripe.BackColor = $Clr.Header
        $Icon.Text = "⚠"
        $Icon.ForeColor = [System.Drawing.Color]::OrangeRed
    }
    elseif ($SoonCount -gt 0) {
        # زرد
        $Stripe.BackColor = $Clr.TrayYellow
        $Icon.Text = "⏰"
        $Icon.ForeColor = $Clr.TrayYellow
    }
    else {
        # آبی
        $Stripe.BackColor = $Clr.Accent
        $Icon.Text = "💳"
        $Icon.ForeColor = $Clr.Accent
    }

    $Stripe.Refresh()
    $Icon.Refresh()
    $Widget.Refresh()
}
#  پیام مودال (NiceMessage)
# ============================================================
function Show-NiceMessage {
    param(
        [string]$Message,
        [string]$Title = 'اطلاعیه',
        [ValidateSet('Info','Warning','Error','Success')]
        [string]$Type  = 'Info'
    )

    $mf                   = New-Object System.Windows.Forms.Form
    $mf.FormBorderStyle   = 'None'
    $mf.BackColor         = [System.Drawing.Color]::FromArgb(45, 45, 45)
    $mf.Opacity           = 0
    $mf.TopMost           = $true
    $mf.Size              = New-Object System.Drawing.Size(380, 175)
    $mf.StartPosition     = 'CenterScreen'
    $mf.RightToLeft       = 'Yes'
    $mf.RightToLeftLayout = $true

    $accentColor = switch ($Type) {
        'Success' { [System.Drawing.Color]::FromArgb( 50, 131, 214, 146) }
        'Warning' { [System.Drawing.Color]::FromArgb( 50,  76, 199, 186) }
        'Error'   { [System.Drawing.Color]::FromArgb(180, 200,   0,   0) }
        default   { [System.Drawing.Color]::FromArgb( 50, 171,  55, 173) }
    }

    $strip           = New-Object System.Windows.Forms.Panel
    $strip.Size      = New-Object System.Drawing.Size(380, 6)
    $strip.Location  = New-Object System.Drawing.Point(0, 0)
    $strip.BackColor = $accentColor
    $mf.Controls.Add($strip)

    $icon = switch ($Type) { 'Success'{'✔'} 'Warning'{'⚠'} 'Error'{'✖'} default{'ℹ'} }

    $lblTitle           = New-Object System.Windows.Forms.Label
    $lblTitle.Text      = "$icon  $Title"
    $lblTitle.ForeColor = $accentColor
    $lblTitle.BackColor = $Clr.Transparent
    $lblTitle.Font      = New-Object System.Drawing.Font('SG Kara', 11, [System.Drawing.FontStyle]::Bold)
    $lblTitle.Size      = New-Object System.Drawing.Size(340, 30)
    $lblTitle.Location  = New-Object System.Drawing.Point(20, 20)
    $lblTitle.TextAlign = 'MiddleLeft'
    $mf.Controls.Add($lblTitle)

    $lblMsg                            = New-Object System.Windows.Forms.Label
    $lblMsg.Text                       = $Message
    $lblMsg.ForeColor                  = $Clr.Gainsboro
    $lblMsg.BackColor                  = $Clr.Transparent
    $lblMsg.Font                       = New-Object System.Drawing.Font($Config.FontText, $Config.FontSizeSmall)
    $lblMsg.Size                       = New-Object System.Drawing.Size(340, 50)
    $lblMsg.Location                   = New-Object System.Drawing.Point(20, 58)
    $lblMsg.TextAlign                  = 'MiddleLeft'
    $lblMsg.UseCompatibleTextRendering = $true
    $mf.Controls.Add($lblMsg)

    $mfRef = $mf
    $btnOk                           = New-Object System.Windows.Forms.Button
    $btnOk.Text                      = 'باشه'
    $btnOk.Font                      = New-Object System.Drawing.Font($Config.FontUi, $Config.FontSizeNormal)
    $btnOk.ForeColor                 = $Clr.White
    $btnOk.BackColor                 = $accentColor
    $btnOk.FlatStyle                 = 'Flat'
    $btnOk.FlatAppearance.BorderSize = 0
    $btnOk.Size                      = New-Object System.Drawing.Size(380, 42)
    $btnOk.Location                  = New-Object System.Drawing.Point(0, 133)
    $btnOk.TabStop                   = $false
    $btnOk.Add_Click({ $mfRef.Close() }.GetNewClosure())
    $mf.Controls.Add($btnOk)

    $mf.Add_Shown({
        $mf.ActiveControl = $null
        Invoke-FadeIn -Form $mf -TargetOpacity 0.97
    })
    $mf.ShowDialog()
}


# ============================================================
#  فرم پرداخت (PaymentForm)
#  پارامتر OnSuccess: scriptblock که بعد از ثبت موفق اجرا می‌شود
#  (برای auto-refresh لیست اقساط)
# ============================================================

# نمایش فرم ثبت پرداخت.
function Show-PaymentForm {
    param(
        $item,
        $ExcelFile,
        $SheetName,
        [System.Windows.Forms.Button]$PayBtn,
        [scriptblock]$OnSuccess
    )

    $pfHeight = 250
    $btnH     = 50

    $pf                   = New-Object System.Windows.Forms.Form
    $pf.FormBorderStyle   = 'None'
    $pf.BackColor         = $Clr.Black
    $pf.Opacity           = 0
    $pf.TopMost           = $true
    $pf.RightToLeft       = 'Yes'
    $pf.RightToLeftLayout = $true
    $pf.Size              = New-Object System.Drawing.Size(440, $pfHeight)
    $pf.StartPosition     = 'CenterScreen'

    # دکمه پرداخت → حالت active
    $capturedPayBtn = $PayBtn
    Set-PayBtnActive -Btn $capturedPayBtn

    # بسته شدن فرم → reset دکمه
    $pf.Add_FormClosed({
        if ($null -ne $capturedPayBtn -and -not $capturedPayBtn.IsDisposed) {
            Set-PayBtnDefault -Btn $capturedPayBtn
        }
    }.GetNewClosure())

    # هدر
    $ph           = New-Object System.Windows.Forms.Panel
    $ph.Size      = New-Object System.Drawing.Size(440, $Config.HeaderH)
    $ph.BackColor = $Clr.AccentAlpha
    $pf.Controls.Add($ph)

    $ptitle           = New-Object System.Windows.Forms.Label
    $ptitle.Text      = "پرداخت $($item.Name)"
    $ptitle.ForeColor = $Clr.White
    $ptitle.BackColor = $Clr.Transparent
    $ptitle.Font      = New-Object System.Drawing.Font('SG Kara', 12, [System.Drawing.FontStyle]::Bold)
    $ptitle.Size      = New-Object System.Drawing.Size(380, $Config.HeaderH)
    $ptitle.Location  = New-Object System.Drawing.Point(30, 0)
    $ptitle.TextAlign = 'MiddleCenter'
    $ph.Controls.Add($ptitle)

    # فیلد یادداشت (اجباری)
    $lblNote             = New-Object System.Windows.Forms.Label
    $lblNote.Text        = '* مشخصات پرداخت / یادداشت :'
    $lblNote.ForeColor   = $Clr.Gainsboro
    $lblNote.BackColor   = $Clr.Transparent
    $lblNote.Font        = New-Object System.Drawing.Font($Config.FontText, $Config.FontSizeSmall)
    $lblNote.Size        = New-Object System.Drawing.Size(180, 22)
    $lblNote.Location    = New-Object System.Drawing.Point(20, 66)
    $lblNote.RightToLeft = 'Yes'
    $pf.Controls.Add($lblNote)

    $notePanel = New-Object System.Windows.Forms.Panel
    $notePanel.Size = New-Object System.Drawing.Size(348, 28)
    $notePanel.Location = New-Object System.Drawing.Point(20, 91)
    $notePanel.BackColor = $Clr.BgDark
    $notePanel.BorderStyle = 'FixedSingle'

    $txtNote = New-Object System.Windows.Forms.TextBox
    $txtNote.Multiline = $false
    $txtNote.BorderStyle = 'None'
    $txtNote.BackColor = $Clr.BgDark
    $txtNote.ForeColor = $Clr.White
    $txtNote.Font = New-Object System.Drawing.Font('Tahoma', 10)
    $txtNote.RightToLeft = 'Yes'

    $txtNote.Size = New-Object System.Drawing.Size(338, 20)
    $txtNote.Location = New-Object System.Drawing.Point(4, 5)

    $notePanel.Controls.Add($txtNote)
    $pf.Controls.Add($notePanel)
    # reset رنگ textbox هنگام تایپ
    $txtNote.Add_TextChanged({
        if ($this.Text.Trim().Length -gt 0) {
            $this.BackColor = $Clr.BgDark
        }
    }.GetNewClosure())

    # چک‌باکس تأیید
    $chk             = New-Object System.Windows.Forms.CheckBox
    $chk.Text        = 'پرداخت این قسط را تأیید می‌کنم'
    $chk.ForeColor   = $Clr.White
    $chk.BackColor   = $Clr.Transparent
    $chk.Font        = New-Object System.Drawing.Font($Config.FontText, $Config.FontSizeSmall, [System.Drawing.FontStyle]::Bold)
    $chk.Size        = New-Object System.Drawing.Size(360, 18)
    $chk.Location    = New-Object System.Drawing.Point(20, 130)
    $chk.RightToLeft = 'Yes'
    $pf.Controls.Add($chk)

        # پیام وضعیت قسط داخل فرم پرداخت
    $lblInstallmentStatus = New-Object System.Windows.Forms.Label
    $lblInstallmentStatus.Size = New-Object System.Drawing.Size(180, 22)
    $lblInstallmentStatus.Location = New-Object System.Drawing.Point(200, 62)
    $lblInstallmentStatus.TextAlign = 'Middleleft'
    $lblInstallmentStatus.ForeColor = $Clr.Header
    $lblInstallmentStatus.Font = New-Object System.Drawing.Font(
        'Tahoma', 9, [System.Drawing.FontStyle]::Bold
    )

if ($null -eq $item.RemainingInstallments) {

    $lblInstallmentStatus.Text = '؟'
}
elseif ($item.RemainingInstallments -eq 1) {

    $lblInstallmentStatus.Text = 'آخرین قسط این وام است'
}
else {

    $lblInstallmentStatus.Text =
        " $($item.RemainingInstallments)   قسط"
}

    $pf.Controls.Add($lblInstallmentStatus)

    # گزینه تمدید
    $chkExtend = New-Object System.Windows.Forms.CheckBox
    $chkExtend.Text = 'تمدید اقساط'
    $chkExtend.AutoSize = $true
    $chkExtend.Font        = New-Object System.Drawing.Font($Config.FontText, $Config.FontSizeSmall, [System.Drawing.FontStyle]::Bold)
    $chkExtend.Location = New-Object System.Drawing.Point(20, 150)
    $chkExtend.ForeColor = $Clr.White
    $chkExtend.BackColor = $Clr.Transparent
    $pf.Controls.Add($chkExtend)

    # تعداد اقساط تمدیدی
    $numExtend = New-Object System.Windows.Forms.NumericUpDown
    $numExtend.Minimum = 0
    $numExtend.Maximum = 999
    $numExtend.Value = 0
    $numExtend.Size = New-Object System.Drawing.Size(40, 25)
    $numExtend.Location = New-Object System.Drawing.Point(385, 147)
    $numExtend.Enabled = $false
    $pf.Controls.Add($numExtend)

    $lblExtend = New-Object System.Windows.Forms.Label
    $lblExtend.Text = 'تعداد:'
    $lblExtend.AutoSize = $true
    $lblExtend.Font        = New-Object System.Drawing.Font($Config.FontText, $Config.FontSizeSmall, [System.Drawing.FontStyle]::Bold)
    $lblExtend.Location = New-Object System.Drawing.Point(345, 150)
    $lblExtend.ForeColor = $Clr.Gainsboro
    $pf.Controls.Add($lblExtend)

    $chkExtend.Add_CheckedChanged({
        $numExtend.Enabled = $chkExtend.Checked
    })
# تگ های سریع
# ============================================================

$QuickTags = @(
    "رفاه",
    "ملی",
    "ویپاد",
    "بلو",
    "نقدی",
    "رسید دارد",
    "تسویه شد"
)

$TagIcons = @{
    "رفاه"       = "🏦"
    "ملی"        = "🏛"
    "ویپاد"      = "🌐"
    "بلو"        = "💙"
    "نقدی"       = "💵"
    "رسید دارد" = "📄"
    "تسویه شد"   = "✅"
}
$ImageFolder = Join-Path $PSScriptRoot "Images"

$TagImages = @{
    "رفاه"       = Join-Path $ImageFolder "refah.png"
    "ملی"        = Join-Path $ImageFolder "Melli.png"
    "ویپاد"      = Join-Path $ImageFolder "wepod.png"
    "بلو"        = Join-Path $ImageFolder "blue1.png"
    "نقدی"       = Join-Path $ImageFolder "cash.png"
    "رسید دارد" = Join-Path $ImageFolder "receipt.png"
    "تسویه شد"   = Join-Path $ImageFolder "paid.png"
}
# دکمه تگ
# ============================================================

$btnTag = New-Object System.Windows.Forms.Button
$btnTag.Size = New-Object System.Drawing.Size(28,28)
$btnTag.Location = New-Object System.Drawing.Point(368,91)
$btnTag.FlatStyle = 'Flat'
$btnTag.FlatAppearance.BorderSize = 0
$btnTag.BackColor = $Clr.BgCard
$btnTag.ForeColor = $Clr.White
$btnTag.Font = New-Object System.Drawing.Font($Config.FontEmoji, $Config.FontSizeNormal)
$btnTag.Text = "🏷"
$btnTag.Cursor = 'Hand'
$btnTag.TabStop = $false

$pf.Controls.Add($btnTag)
# Popup
# ============================================================

# نمایش پنجره برچسب‌های سریع.
function Show-TagPopup{

    param(
        [System.Windows.Forms.Form]$Owner,
        [System.Windows.Forms.Control]$Target,
        [System.Windows.Forms.TextBox]$TextBox
    )

    $Popup = New-Object System.Windows.Forms.Form
    $Popup.FormBorderStyle = 'None'
    $Popup.ShowInTaskbar = $false
    $Popup.StartPosition = 'Manual'
    $Popup.TopMost = $true
   $Popup.Add_VisibleChanged({

    if($Popup.Visible){

        $Popup.Activate()

    }

}.GetNewClosure())

$Popup.Add_Deactivate({

    $Popup.Close()

}.GetNewClosure())
    $Popup.BackColor = $Clr.BgCard
    $Popup.Size = New-Object System.Drawing.Size(190,250)

    $Popup.Location = $Target.PointToScreen(
        (New-Object System.Drawing.Point(0,$Target.Height))
    )

    $Panel = New-Object System.Windows.Forms.FlowLayoutPanel
    $Panel.Dock = 'Fill'
    $Panel.FlowDirection = 'TopDown'
    $Panel.WrapContents = $false
    $Panel.AutoScroll = $true
    $Panel.Padding = New-Object System.Windows.Forms.Padding(5)

    $Popup.Controls.Add($Panel)

    foreach($Tag in $QuickTags){

        $SelectedTag = $Tag

        $Btn = New-Object System.Windows.Forms.Button
        $Btn.Width = 165
        $Btn.Height = 34

        $Btn.FlatStyle = 'Flat'
        $Btn.FlatAppearance.BorderSize = 0
        $Btn.BackColor = $Clr.BgCard
        $Btn.ForeColor = $Clr.White
        $Btn.Cursor = 'Hand'
        $Btn.Text = ""

  
# PictureBox آیکن
# ============================================================

$Icon = New-Object System.Windows.Forms.PictureBox

$Icon.Size = New-Object System.Drawing.Size(34,34)
$Icon.Location = New-Object System.Drawing.Point(131,0)

$Icon.SizeMode = [System.Windows.Forms.PictureBoxSizeMode]::Zoom
$Icon.BackColor = $Clr.Transparent

# گوشه های گرد
$Radius = 10

$Path = New-Object System.Drawing.Drawing2D.GraphicsPath

$Path.AddArc(0,0,$Radius,$Radius,180,90)
$Path.AddArc($Icon.Width-$Radius,0,$Radius,$Radius,270,90)
$Path.AddArc($Icon.Width-$Radius,$Icon.Height-$Radius,$Radius,$Radius,0,90)
$Path.AddArc(0,$Icon.Height-$Radius,$Radius,$Radius,90,90)

$Path.CloseFigure()

$Icon.Region = New-Object System.Drawing.Region($Path)

# بارگذاری تصویر
if(Test-Path $TagImages[$Tag]){

    $fs = [System.IO.File]::OpenRead($TagImages[$Tag])

    try{

        $img = [System.Drawing.Image]::FromStream($fs)

        $Icon.Image = $img.Clone()

        $img.Dispose()

    }
    finally{

        $fs.Close()
        $fs.Dispose()

    }

}
        # متن
        $Lbl = New-Object System.Windows.Forms.Label
        $Lbl.Text = $Tag
        $Lbl.Font = New-Object System.Drawing.Font("Tahoma",9)
        $Lbl.AutoSize = $false
       $Lbl.Size = New-Object System.Drawing.Size(105,34)
$Lbl.Location = New-Object System.Drawing.Point(20,0)

$Lbl.RightToLeft = 'Yes'
$Lbl.TextAlign = [System.Drawing.ContentAlignment]::Middleleft
        $Lbl.BackColor = $Clr.Transparent
        $Lbl.ForeColor = $Clr.White
        $Btn.Controls.Add($Icon)
        $Btn.Controls.Add($Lbl)

        $Enter = {

            $Btn.BackColor = $Clr.Accent
            $Lbl.BackColor = $Clr.Accent
            $Icon.BackColor = $Clr.Accent

        }.GetNewClosure()

        $Leave = {

            $Btn.BackColor = $Clr.BgCard
            $Lbl.BackColor = $Clr.Transparent
            $Icon.BackColor = $Clr.Transparent

        }.GetNewClosure()

        $Btn.Add_MouseEnter($Enter)
        $Lbl.Add_MouseEnter($Enter)
        $Icon.Add_MouseEnter($Enter)

        $Btn.Add_MouseLeave($Leave)
        $Lbl.Add_MouseLeave($Leave)
        $Icon.Add_MouseLeave($Leave)

        $Click = {

            if([string]::IsNullOrWhiteSpace($TextBox.Text)){
                $TextBox.Text = $SelectedTag
            }
            elseif($TextBox.Text -notmatch [regex]::Escape($SelectedTag)){
                $TextBox.AppendText(" - $SelectedTag")
            }

            $Popup.Close()

        }.GetNewClosure()

        $Btn.Add_Click($Click)
        $Lbl.Add_Click($Click)
        $Icon.Add_Click($Click)

        $Panel.Controls.Add($Btn)

    }

    $Popup.ShowDialog($Owner)

}
# نمایش Popup
# ============================================================

$btnTag.Add_Click({

    Show-TagPopup `
        -Owner $pf `
        -Target $btnTag `
        -TextBox $txtNote

})
# دکمه افزودن تاریخ
# ============================================================

$btnDate = New-Object System.Windows.Forms.Button
$btnDate.Size = New-Object System.Drawing.Size(28,28)
$btnDate.Location = New-Object System.Drawing.Point(397,91)
$btnDate.FlatStyle = 'Flat'
$btnDate.FlatAppearance.BorderSize = 0
$btnDate.Font = New-Object System.Drawing.Font($Config.FontEmoji, $Config.FontSizeNormal)
$btnDate.Text = "📅"
$btnDate.ForeColor = $Clr.White
$btnDate.BackColor = $Clr.Accent
$btnDate.Cursor = 'Hand'
$btnDate.TabStop = $false
$btnDate.Tag = $true

$pf.Controls.Add($btnDate)

$btnDate.Add_Click({

    $this.Tag = -not [bool]$this.Tag

    if($this.Tag){

        $this.BackColor = $Clr.Accent

    }
    else{

        $this.BackColor = $Clr.DangerBtn

    }

}.GetNewClosure())

    # دکمه انصراف
    $btnCancel                           = New-Object System.Windows.Forms.Button
    $btnCancel.Text                      = '✖ انصراف'
    $btnCancel.Font                      = New-Object System.Drawing.Font($Config.FontUi, $Config.FontSizeNormal)
    $btnCancel.ForeColor                 = $Clr.White
    $btnCancel.BackColor                 = $Clr.BgCard
    $btnCancel.FlatStyle                 = 'Flat'
    $btnCancel.FlatAppearance.BorderSize = 0
    $btnCancel.Size                      = New-Object System.Drawing.Size(220, $btnH)
    $btnCancel.Location                  = New-Object System.Drawing.Point(0, ($pfHeight - $btnH))
    $btnCancel.TabStop                   = $false
    $bc = $btnCancel
    $btnCancel.Add_MouseEnter({ $bc.BackColor = $Clr.DangerBtn }.GetNewClosure())
    $btnCancel.Add_MouseLeave({ $bc.BackColor = $Clr.BgCard    }.GetNewClosure())
    $pfRef = $pf
    $btnCancel.Add_Click({ $pfRef.Close() }.GetNewClosure())
    $pf.Controls.Add($btnCancel)

    # دکمه ثبت
    $btnSave                           = New-Object System.Windows.Forms.Button
    $btnSave.Text                      = '✔ ثبت پرداخت'
    $btnSave.Font                      = New-Object System.Drawing.Font($Config.FontUi, $Config.FontSizeNormal)
    $btnSave.ForeColor                 = $Clr.White
    $btnSave.BackColor                 = $Clr.BgCard
    $btnSave.FlatStyle                 = 'Flat'
    $btnSave.FlatAppearance.BorderSize = 0
    $btnSave.Size                      = New-Object System.Drawing.Size(220, $btnH)
    $btnSave.Location                  = New-Object System.Drawing.Point(220, ($pfHeight - $btnH))
    $btnSave.TabStop                   = $false
    $bs = $btnSave
    $btnSave.Add_MouseEnter({ $bs.BackColor = $Clr.Accent  }.GetNewClosure())
    $btnSave.Add_MouseLeave({ $bs.BackColor = $Clr.BgCard  }.GetNewClosure())
    $pf.Controls.Add($btnSave)

    $capturedItem      = $item
    $capturedExcel     = $ExcelFile
    $capturedSheet     = $SheetName
    $capturedChk       = $chk
    $capturedTxt       = $txtNote
    $capturedPf        = $pf
    $capturedOnSuccess = $OnSuccess

    $btnSave.Add_Click({
        # Validation 1: فیلد اجباری
        if ([string]::IsNullOrWhiteSpace($capturedTxt.Text)) {
            $capturedTxt.BackColor = [System.Drawing.Color]::FromArgb(255, 80, 30, 30)
            $capturedTxt.Focus()
            Show-NiceMessage `
                -Message "لطفاً مشخصات پرداخت را وارد کنید.`n(شماره رسید، نام بانک یا هر یادداشتی)" `
                -Title 'فیلد اجباری' -Type 'Warning'
            return
        }

        # Validation 2: چک‌باکس
        if (-not $capturedChk.Checked) {
            Show-NiceMessage -Message 'لطفاً ابتدا تأیید پرداخت را علامت بزنید.' -Title 'توجه' -Type 'Warning'
            return
        }

       $note = $capturedTxt.Text.Trim()
        # Validation 2:درج تاریخ
       if($btnDate.Tag){

        $pc  = [System.Globalization.PersianCalendar]::new()
        $now = Get-Date

        $today = "{0:0000}/{1:00}/{2:00}" -f `
        $pc.GetYear($now),
        $pc.GetMonth($now),
        $pc.GetDayOfMonth($now)

    $note = "$today - $note"
}
# محاسبه تعداد اقساط جدید در لحظه ثبت
$newInstallmentCount = $null

if (
    $null -ne $capturedItem.RemainingInstallments -and
    "$($capturedItem.RemainingInstallments)".Trim() -match '^\d+$'
) {
    $newInstallmentCount =
        [Math]::Max(0, [int]$capturedItem.RemainingInstallments - 1)

    if ($chkExtend.Checked) {
        $newInstallmentCount += [int]$numExtend.Value
    }
}

 # بررسی قفل بودن فایل
try {
    $stream = [System.IO.File]::Open(
        $capturedExcel,
        'Open',
        'ReadWrite',
        'None'
    )

    $stream.Close()
    $stream.Dispose()
}
catch {
    Show-NiceMessage `
        -Message "فایل اکسل باز است.`nلطفاً آن را ببندید." `
        -Title 'فایل در دسترس نیست' `
        -Type 'Error'
    return
}


try {
if($null -eq $capturedItem.id){
    throw "capturedItem.id خالی است"
}

Update-SupabasePayment `
    -Id $capturedItem.id `
    -Column $capturedItem.MonthColumn `
    -Value $note `
    -NewInstallmentCount $newInstallmentCount
    Add-SupabasePaymentHistory `
    -ExpenseId $capturedItem.id `
    -MonthColumn $capturedItem.MonthColumn `
    -Note $note `
    -Amount $capturedItem.Amount

Update-ExcelPayment `
    -Id $capturedItem.id `
    -Column $capturedItem.MonthColumn `
    -Value $note `
    -NewInstallmentCount $newInstallmentCount

}
catch {

    Show-NiceMessage `
        -Message "خطا در ذخیره Supabase:`n$($_.Exception.Message)" `
        -Title "خطا" `
        -Type "Error"

    return
}

    # پیام موفقیت
    # ========================================================

    Show-NiceMessage `
        -Message "پرداخت وام $($capturedItem.Name) در ستون $($capturedItem.MonthColumn) ثبت شد.`n`n$note" `
        -Title 'ثبت موفق' `
        -Type 'Success'
    # بعد از تأیید پیام، فرم پرداخت فوراً مخفی شود
    # ========================================================

    $capturedPf.Hide()

    [System.Windows.Forms.Application]::DoEvents()
    # سپس انیمیشن حذف کارت
    # ========================================================

    Invoke-CardRemove `
        -Card $PayBtn.Parent `
        -Amount $capturedItem.Amount
    # سپس رفرش لیست، ویجت و Tray
    # ========================================================

    if ($null -ne $capturedOnSuccess) {
        & $capturedOnSuccess
    }
    # پایان فرم Modal
    # ========================================================

    $capturedPf.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $capturedPf.Close()

}.GetNewClosure())

$pf.Add_Shown({
    $pf.ActiveControl = $txtNote
    Invoke-FadeIn -Form $pf -TargetOpacity 0.95
})

$pf.ShowDialog()

}
#  کارت هر قسط (InstallmentCard)
# ============================================================
function New-InstallmentCard {
    param(
    $item,
    [int]$yPos,
    $ExcelFile,
    $SheetName,
    $OnPaySuccess,

    [System.Windows.Forms.Panel]$ParentPanel,
    [System.Windows.Forms.Panel]$CardPanel
)

    $card           = New-Object System.Windows.Forms.Panel
    $card.Size      = New-Object System.Drawing.Size(430, $Config.CardH)
    $card.Location  = New-Object System.Drawing.Point(0, $yPos)
    $card.BackColor = if    ($item.Days -lt 0) { $Clr.Danger }
                      elseif ($item.Days -le 2) { [System.Drawing.Color]::FromArgb(80, 150, 5, 5) }
                      elseif ($item.Days -le 5) { $Clr.Mid }
                      else                      { $Clr.Low  }

    # ── دکمه پرداخت ──
    # حالت‌ها:
    #   default  → ForeColor=White,    BackColor=BgCard        (Tag=$false)
    #   hover    → ForeColor=PayHover, BackColor=BgCard        (فقط وقتی Tag=$false)
    #   active   → ForeColor=PayActive,BackColor=PayActiveBg   (Tag=$true، فرم باز است)
    $btnPay                                    = New-Object System.Windows.Forms.Button
    $btnPay.Text                               = '💳'
    $btnPay.Font                               = New-Object System.Drawing.Font('Segoe UI Emoji', 11)
    $btnPay.FlatStyle                          = 'Flat'
    $btnPay.FlatAppearance.BorderSize          = 0
    $btnPay.FlatAppearance.BorderColor         = $Clr.BgCard
    $btnPay.FlatAppearance.MouseOverBackColor  = $Clr.BgCard   # hover پس‌زمینه دستی کنترل می‌شود
    $btnPay.FlatAppearance.MouseDownBackColor  = $Clr.BgCard
    $btnPay.Size                               = New-Object System.Drawing.Size(32, $Config.CardH)
    $btnPay.Location                           = New-Object System.Drawing.Point(0, 1)
    $btnPay.TabStop                            = $false
    $btnPay.Cursor                             = [System.Windows.Forms.Cursors]::Hand
    Set-PayBtnDefault -Btn $btnPay   # حالت اولیه

    $bp = $btnPay
    $btnPay.Add_MouseEnter({
        if (-not [bool]$bp.Tag) { $bp.ForeColor = $Clr.PayHover }
    }.GetNewClosure())
    $btnPay.Add_MouseLeave({
        if (-not [bool]$bp.Tag) { $bp.ForeColor = $Clr.White }
    }.GetNewClosure())

    # مبلغ
    $lblAmount           = New-Object System.Windows.Forms.Label
    $lblAmount.Text      = '{0:N0} ریال' -f $item.Amount
    $lblAmount.ForeColor = $Clr.Gainsboro
    $lblAmount.BackColor = $Clr.Transparent
    $lblAmount.Font      = New-Object System.Drawing.Font($Config.FontText, $Config.FontSizeSmall)
    $lblAmount.AutoSize  = $false
    $lblAmount.Size      = New-Object System.Drawing.Size(110, 30)
    $lblAmount.Location  = New-Object System.Drawing.Point(35, 1)
    $lblAmount.TextAlign = 'MiddleLeft'
    $card.Controls.Add($lblAmount)

    # نام و روزهای مانده
    $dayText         = if ($item.Days -lt 0) { "$([math]::Abs($item.Days))      روز معوق " } else { "$($item.Days)   روز مانده " }
    $lblName         = New-Object System.Windows.Forms.Label
    $lblName.Text    = "$($item.Name)  :   $dayText"
    $lblName.ForeColor               = $Clr.White
    $lblName.BackColor               = $Clr.Transparent
    $lblName.Font                    = New-Object System.Drawing.Font($Config.FontText, $Config.FontSizeSmall, [System.Drawing.FontStyle]::Bold)
    $lblName.UseCompatibleTextRendering = $true
    $lblName.AutoSize                = $false
    $lblName.Size                    = New-Object System.Drawing.Size(210, 30)
    $lblName.Location                = New-Object System.Drawing.Point(190, 1)
    $lblName.TextAlign               = 'MiddleLeft'
    $card.Controls.Add($lblName)

     $lblRemaining = New-Object System.Windows.Forms.Label

if ($null -eq $item.RemainingInstallments) {
    $lblRemaining.Text = ''
}
else {
    $lblRemaining.Text = " $($item.RemainingInstallments)"
}

$lblRemaining.ForeColor = $Clr.header
$lblRemaining.BackColor = $Clr.Transparent
$lblRemaining.Font = New-Object System.Drawing.Font(
    'Tahoma', 9, [System.Drawing.FontStyle]::Bold
)
$lblRemaining.AutoSize = $true
$lblRemaining.Location = New-Object System.Drawing.Point(160, 8)

$card.Controls.Add($lblRemaining)

    $capturedItem      = $item
    $capturedFile      = $ExcelFile
    $capturedSheet     = $SheetName
    $capturedBtn       = $btnPay
    $capturedOnSuccess = $OnPaySuccess

    $btnPay.Add_Click({
        Show-PaymentForm `
            -item      $capturedItem  `
            -ExcelFile $capturedFile  `
            -SheetName $capturedSheet `
            -PayBtn    $capturedBtn   `
            -OnSuccess $capturedOnSuccess `
            -Button $bp
    }.GetNewClosure())

    $card.Controls.Add($btnPay)
    return $card
}

#-------------------------------------
# اشرط بسته بودن اکسل
# چک بسته بودن اکسل
function Test-ExcelAvailable {

    param(
        [string]$ExcelFile
    )

    try {

        $stream = [System.IO.File]::Open(
            $ExcelFile,
            'Open',
            'ReadWrite',
            'None'
        )

        $stream.Close()
        $stream.Dispose()

        return $true

    }
    catch {

        return $false
    }

}
    
#  هدر اصلی (MainHeader)
# ============================================================
# ساخت هدر فرم اصلی.
function New-MainHeader {
    param(
        [System.Windows.Forms.Form]$ParentForm,
        [System.Windows.Forms.Form]$Widget,
        $Screen,
        $CardsPanel,
        $ExcelFile,
        $SheetName
    )

    $header           = New-Object System.Windows.Forms.Panel
    $header.Size      = New-Object System.Drawing.Size($Config.FormWidth, $Config.HeaderH)
    $header.BackColor = $Clr.Header
    $header.Location  = New-Object System.Drawing.Point(0, 0)

    $titleLbl           = New-Object System.Windows.Forms.Label
    $titleLbl.Text      = '⏰  سررسید اقساط'
    $titleLbl.ForeColor = $Clr.White
    $titleLbl.BackColor = $Clr.Transparent
    $titleLbl.Font      = New-Object System.Drawing.Font('SG Kara', 13, [System.Drawing.FontStyle]::Bold)
    $titleLbl.Size      = New-Object System.Drawing.Size(200, $Config.HeaderH)
    $titleLbl.Location  = New-Object System.Drawing.Point(120, 0)
    $titleLbl.TextAlign = 'MiddleCenter'
    $header.Controls.Add($titleLbl)

    # دکمه Minimize
    $lblMin           = New-Object System.Windows.Forms.Label
    $lblMin.Text      = '—'
    $lblMin.Font      = New-Object System.Drawing.Font($Config.FontEmoji, $Config.FontSizeLarge)
    $lblMin.ForeColor = $Clr.White
    $lblMin.BackColor = $Clr.Transparent
    $lblMin.AutoSize  = $false
    $lblMin.Size      = New-Object System.Drawing.Size(25, 18)
    $lblMin.Location  = New-Object System.Drawing.Point(10, 18)
    $lblMin.TextAlign = 'MiddleCenter'
    $lblMin.Cursor    = [System.Windows.Forms.Cursors]::Hand
    $lblMin.Add_MouseEnter({ $this.ForeColor = $Clr.HeadetBtn })
    $lblMin.Add_MouseLeave({ $this.ForeColor = $Clr.White     })
    $header.Controls.Add($lblMin)

    # دکمه Refresh
    $lblRef           = New-Object System.Windows.Forms.Label
    $lblRef.Text      = '↻'
    $lblRef.Font      = New-Object System.Drawing.Font($Config.FontEmoji, $Config.FontSizeLarge)
    $lblRef.ForeColor = $Clr.White
    $lblRef.BackColor = $Clr.Transparent
    $lblRef.AutoSize  = $false
    $lblRef.Size      = New-Object System.Drawing.Size(25, 18)
    $lblRef.Location  = New-Object System.Drawing.Point(36, 18)
    $lblRef.TextAlign = 'MiddleCenter'
    $lblRef.Cursor    = [System.Windows.Forms.Cursors]::Hand
    $lblRef.Add_MouseEnter({ $this.ForeColor = $Clr.HeadetBtn })
    $lblRef.Add_MouseLeave({ $this.ForeColor = $Clr.White     })
    $header.Controls.Add($lblRef)
    # دکمه ایجاد قسط جدید
$lblAdd = New-Object System.Windows.Forms.Label
$lblAdd.Text = '➕'
$lblAdd.Font = New-Object System.Drawing.Font($Config.FontEmoji, $Config.FontSizeLarge)
$lblAdd.ForeColor = $Clr.White
$lblAdd.BackColor = $Clr.Transparent
$lblAdd.AutoSize = $false
$lblAdd.Size = New-Object System.Drawing.Size(25,18)

# کنار Refresh
$lblAdd.Location = New-Object System.Drawing.Point(60,18)

$lblAdd.TextAlign = 'MiddleCenter'
$lblAdd.Cursor = [System.Windows.Forms.Cursors]::Hand

$lblAdd.Add_MouseEnter({
    $this.ForeColor = $Clr.HeadetBtn
})

$lblAdd.Add_MouseLeave({
    $this.ForeColor = $Clr.White
})

$header.Controls.Add($lblAdd)

    $capturedPanel  = $CardsPanel
    $capturedExcel  = $ExcelFile
    $capturedSheet  = $SheetName
$lblRef.Add_Click({

    Start-Sleep -Milliseconds 500

    $newSoon = @(
        Get-DueSoon `
            -ExcelFile $capturedExcel `
            -SheetName $capturedSheet
    )

    Build-Cards `
        -Parent $capturedPanel `
        -Soon $newSoon `
        -ExcelFile $capturedExcel `
        -SheetName $capturedSheet

    # بروزرسانی وضعیت مینی‌ویجت
    Update-MiniWidget `
        -Widget $global:Widget `
        -Soon $newSoon

    # بروزرسانی Tray
    Update-TrayIcon `
    -Tray $global:TrayIcon `
    -Soon $newSoon

}.GetNewClosure())
$lblAdd.Add_Click({


$newExpense = Show-NewExpenseForm


if($null -eq $newExpense){

    return
}


if(-not (Test-ExcelAvailable -ExcelFile $capturedExcel)){

    Show-NiceMessage `
    -Message "فایل اکسل باز است.`nلطفاً آن را ببندید و دوباره روی ذخیره بزنید." `
    -Title "خطا در ذخیره سازی" `
    -Type "Warning"

    return
}


try 

{if(-not (Test-ExcelAvailable -ExcelFile $capturedExcel)){

    Show-NiceMessage `
    -Message "فایل اکسل باز است. لطفاً آن را ببندید و دوباره ذخیره کنید." `
    -Title "اکسل باز است" `
    -Type "Warning"

    return
}

$result = New-SupabaseExpense `
    -Title $newExpense.Title `
    -Amount $newExpense.Amount `
    -DueDay $newExpense.DueDay `
    -InstallmentCount $newExpense.Count `
    -Note $newExpense.Note `
    -StartMonth $newExpense.StartMonth `
    -Type $newExpense.Type

$result | ConvertTo-Json -Depth 10

if ($null -eq $result) {
    throw "Supabase result is null"
}

$newId = @($result)[0].id

$rowTypeFa = if ($newExpense.Type -eq "Expense") {
    "هزینه"
}
else {
    "قسط"
}

Show-NiceMessage `
    -Message "$rowTypeFa جدید با موفقیت ساخته شد.`nID: $newId" `
    -Title "موفق" `
    -Type "Success"



    }
    catch {
      Show-NiceMessage `
        -Message "خطا در ایجاد قسط:`n$($_.Exception.Message)" `
        -Title "خطا" `
        -Type "Error"


    }


}.GetNewClosure())

    # Drag فرم اصلی از روی هدر
    $script:_dragStart = [System.Drawing.Point]::Empty
    $capturedParent    = $ParentForm

    $dragDown = {
        param($s, $e)
        if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
            $script:_dragStart = $e.Location
        }
    }.GetNewClosure()

    $dragMove = {
        param($s, $e)
        if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
            $capturedParent.Left += $e.X - $script:_dragStart.X
            $capturedParent.Top  += $e.Y - $script:_dragStart.Y
        }
    }.GetNewClosure()

    $header.Add_MouseDown($dragDown)
    $header.Add_MouseMove($dragMove)
    $titleLbl.Add_MouseDown($dragDown)
    $titleLbl.Add_MouseMove($dragMove)

    # Minimize → ویجت
    $capturedParent2 = $ParentForm
    $capturedWidget  = $Widget
    $capturedScreen  = $Screen

    $lblMin.Add_Click({
        $savedLoc = $capturedParent2.Location
        Invoke-FadeOut -Form $capturedParent2
        $capturedParent2.Hide()

        if ($null -ne $capturedWidget -and -not $capturedWidget.IsDisposed) {
            $capturedWidget.Top  = $savedLoc.Y
            $capturedWidget.Left = $capturedScreen.Width
            $capturedWidget.Show()
            Invoke-SlideIn -Form $capturedWidget `
                -FromX $capturedScreen.Width `
                -ToX   ($capturedScreen.Width - $Config.WidgetW)
        }
    }.GetNewClosure())

    return $header
}
#  ردیف جمع کل (SumPanel)
# ============================================================

# ساخت پنل جمع مبالغ.
function New-SumPanel {
    param([int]$yPos)

    $panel           = New-Object System.Windows.Forms.Panel
    $panel.Size      = New-Object System.Drawing.Size(430, $Config.SumH)
    $panel.Location  = New-Object System.Drawing.Point(0, $yPos)
    $panel.BackColor = $Clr.SumBg
    $panel.Tag       = 'SumPanel'

    # خط جداکننده بالا
    $sep           = New-Object System.Windows.Forms.Panel
    $sep.Size      = New-Object System.Drawing.Size(430, 1)
    $sep.Location  = New-Object System.Drawing.Point(0, 0)
    $sep.BackColor = $Clr.Accent
    $panel.Controls.Add($sep)

    # آیکون جمع
    $lblIcon           = New-Object System.Windows.Forms.Label
    $lblIcon.Text      = '∑'
    $lblIcon.Font      = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
    $lblIcon.ForeColor = $Clr.SumFg
    $lblIcon.BackColor = $Clr.Transparent
    $lblIcon.Size      = New-Object System.Drawing.Size(30, $Config.SumH)
    $lblIcon.Location  = New-Object System.Drawing.Point(12, 0)
    $lblIcon.TextAlign = 'MiddleCenter'
    $panel.Controls.Add($lblIcon)

    # برچسب عنوان
    $lblTitle           = New-Object System.Windows.Forms.Label
    $lblTitle.Text      = 'جمع باقی‌مانده :'
    $lblTitle.Font      = New-Object System.Drawing.Font('Tahoma', 8)
    $lblTitle.ForeColor = $Clr.Gainsboro
    $lblTitle.BackColor = $Clr.Transparent
    $lblTitle.AutoSize  = $false
    $lblTitle.Size      = New-Object System.Drawing.Size(105, $Config.SumH)
    $lblTitle.Location  = New-Object System.Drawing.Point(190, 0)
    $lblTitle.TextAlign = 'MiddleLeft'
    $panel.Controls.Add($lblTitle)

    # برچسب مبلغ — با نام Tag برای آپدیت بعدی
    $lblAmount           = New-Object System.Windows.Forms.Label
    $lblAmount.Text      = '---'
    $lblAmount.Font      = New-Object System.Drawing.Font('Tahoma', 10, [System.Drawing.FontStyle]::Bold)
    $lblAmount.ForeColor = $Clr.SumFg
    $lblAmount.BackColor = $Clr.Transparent
    $lblAmount.AutoSize  = $false
    $lblAmount.Size      = New-Object System.Drawing.Size(150, $Config.SumH)
    $lblAmount.Location  = New-Object System.Drawing.Point(34, 0)
    $lblAmount.TextAlign = 'MiddleLeft'
    $lblAmount.Name      = 'lblSumAmount'
    $panel.Controls.Add($lblAmount)

    return $panel
}
#  ساخت لیست کارت‌ها (Build-Cards)
# ============================================================

# بازسازی فهرست کارت‌های اقساط.
function Build-Cards {
    param($Parent, $Soon, $ExcelFile, $SheetName)

    if ($null -eq $Parent) { Write-Host 'Build-Cards: Parent is NULL'; return }

    $Parent.Controls.Clear()
    $y = 5

    # scriptblock رفرش — بعد از ثبت موفق پرداخت اجرا می‌شود
    $capturedParent = $Parent
    $capturedExcel  = $ExcelFile
    $capturedSheet  = $SheetName

 $onSuccess = {

    $newSoon = @(
        Get-DueSoon `
            -ExcelFile $capturedExcel `
            -SheetName $capturedSheet
    )

    Build-Cards `
        -Parent $capturedParent `
        -Soon $newSoon `
        -ExcelFile $capturedExcel `
        -SheetName $capturedSheet

    Update-MiniWidget `
        -Widget $global:Widget `
        -Soon $newSoon

    Update-TrayIcon `
        -Tray $global:TrayIcon `
        -Soon $newSoon

}.GetNewClosure()

    foreach ($item in $Soon) {
        $card = New-InstallmentCard `
            -item         $item     `
            -yPos         $y        `
            -ExcelFile    $ExcelFile `
            -SheetName    $SheetName `
            -OnPaySuccess $onSuccess `
            -ParentPanel $Parent `
            -CardPanel   $card
        $Parent.Controls.Add($card)
        $y += $Config.CardH
    }
    # ---------- بروزرسانی جمع ----------
$total = if ($Soon -and $Soon.Count -gt 0) { (@($Soon) | ForEach-Object { [decimal]$_.Amount } | Measure-Object -Sum).Sum } else { [decimal]0 }

$lbl = $Parent.Parent.Controls.Find("lblSumAmount", $true)

if ($lbl.Count -gt 0) {
    $lbl[0].Text = "{0:N0} ریال" -f $total
}

   }

# ============================================================
#  رفرش وضعیت ترایtray (MainForm)
#
#  منطق مشترک وضعیت و آیکن Tray
# ============================================================
# تعیین وضعیت منطقی آیکن Tray.
function Get-TrayState {
    param([array]$Soon)

    $HasOverdue = @($Soon | Where-Object { [int]$_.Days -lt 0 }).Count -gt 0
    $HasSoon    = @($Soon | Where-Object { [int]$_.Days -ge 0 }).Count -gt 0

    if ($HasOverdue) { return "Red" }
    if ($HasSoon)    { return "Yellow" }
    return "Blue"
}

# دریافت مشخصات نمایشی وضعیت Tray.
function Get-TrayStateInfo {
    param(
        [ValidateSet("Blue","Yellow","Red")]
        [string]$State
    )

    switch ($State) {
        "Red" {
            return @{
                Color   = $Clr.TrayRed
                TipText = "⚠ قسط معوق دارید"
                TipIcon = [System.Windows.Forms.ToolTipIcon]::Warning
            }
        }
        "Yellow" {
            return @{
                Color   = $Clr.TrayYellow
                TipText = "⏰ قسط نزدیک به سررسید دارید"
                TipIcon = [System.Windows.Forms.ToolTipIcon]::Info
            }
        }
        default {
            return @{
                Color   = $Clr.TrayBlue
                TipText = "✔ هیچ قسط فعالی وجود ندارد"
                TipIcon = [System.Windows.Forms.ToolTipIcon]::Info
            }
        }
    }
}

# ساخت آیکن گرافیکی Tray.
function New-TrayStatusIcon {
    param([System.Drawing.Color]$BgColor)

    $bmp    = New-Object System.Drawing.Bitmap($Config.TrayIconSize, $Config.TrayIconSize)
    $g      = [System.Drawing.Graphics]::FromImage($bmp)
    $brush  = $null
    $font   = $null
    $format = $null

    try {
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $brush = New-Object System.Drawing.SolidBrush($BgColor)
        $font = New-Object System.Drawing.Font(
            'Segoe UI Emoji',
            8,
            [System.Drawing.FontStyle]::Bold
        )
        $format = New-Object System.Drawing.StringFormat
        $format.Alignment = [System.Drawing.StringAlignment]::Center
        $format.LineAlignment = [System.Drawing.StringAlignment]::Center

        $g.FillEllipse($brush, $Config.TrayCircleInset, $Config.TrayCircleInset, $Config.TrayCircleSize, $Config.TrayCircleSize)
        $g.DrawString(
            '💳',
            $font,
            [System.Drawing.Brushes]::White,
            [System.Drawing.RectangleF]::new(0, 0, $Config.TrayIconSize, $Config.TrayIconSize),
            $format
        )

        $hIcon = $bmp.GetHicon()
        return [System.Drawing.Icon]::FromHandle($hIcon).Clone()
    }
    finally {
        if ($null -ne $format) { $format.Dispose() }
        if ($null -ne $font)   { $font.Dispose() }
        if ($null -ne $brush)  { $brush.Dispose() }
        if ($null -ne $g)      { $g.Dispose() }
        if ($null -ne $bmp)    { $bmp.Dispose() }
    }
}

# به‌روزرسانی همان NotifyIcon موجود.
function Update-TrayIcon {
    param(
        [System.Windows.Forms.NotifyIcon]$Tray,
        [array]$Soon
    )

    if ($null -eq $Tray -or $Tray.IsDisposed) { return }

    $State = Get-TrayState -Soon $Soon
    $Info  = Get-TrayStateInfo -State $State

    $newIcon = New-TrayStatusIcon -BgColor $Info.Color
    $oldIcon = $Tray.Icon

    $Tray.Icon            = $newIcon
    $Tray.BalloonTipText  = $Info.TipText
    $Tray.BalloonTipIcon  = $Info.TipIcon

    if ($null -ne $oldIcon) {
        $oldIcon.Dispose()
    }
}
#  فرم اصلی (MainForm)
# ============================================================

# ساخت فرم اصلی برنامه.
function New-MainForm {
    param($Soon, $ExcelFile, $SheetName, $Screen)

    $hasOverdue = @($Soon | Where-Object { $_.Days -lt 0 })
    $rowCount   = [Math]::Max($Soon.Count, $Config.MinCardRows)
    $formHeight = [Math]::Max(
        $Config.HeaderH + ($rowCount * $Config.CardH) + $Config.SumH + $Config.FooterH + $Config.FormBottomPadding,
        $Config.MinFormHeight
    )

    $form                   = New-Object System.Windows.Forms.Form
    $form.Text              = $Config.AppTitle
    $form.BackColor         = $Clr.Black
    $form.Opacity           = 0
    $form.FormBorderStyle   = 'None'
    $form.TopMost           = $true
    $form.RightToLeft       = 'Yes'
    $form.RightToLeftLayout = $true
    $form.ShowInTaskbar     = $false
    $form.Size              = New-Object System.Drawing.Size($Config.FormWidth, $formHeight)
    $form.StartPosition     = 'Manual'
    $form.Location          = New-Object System.Drawing.Point(
        ($Screen.Width  - $Config.FormWidth),
        ($Screen.Height - $formHeight)
    )
    $form.Tag = $false   # جلوگیری از اجرای چندباره FadeIn

    # ویجت مینیمایز
    $global:Widget = New-MiniWidget `
    -Screen $Screen `
    -HasOverdue ($hasOverdue.Count -gt 0) `
    -MainForm $form
    # پنل کارت‌ها
    $cardsPanel           = New-Object System.Windows.Forms.Panel
    $cardsPanel.Location  = New-Object System.Drawing.Point(0, $Config.HeaderH)
    $cardsPanel.Size      = New-Object System.Drawing.Size(
        $Config.FormWidth,
        ($formHeight - $Config.HeaderH - $Config.SumH - $Config.FooterH)
    )
    $cardsPanel.BackColor = $Clr.Transparent
    $form.Controls.Add($cardsPanel)

    # هدر
    $header = New-MainHeader `
        -ParentForm $form       `
        -Widget     $widget     `
        -Screen     $Screen     `
        -CardsPanel $cardsPanel `
        -ExcelFile  $ExcelFile  `
        -SheetName  $SheetName
    $form.Controls.Add($header)

    Build-Cards -Parent $cardsPanel -Soon $Soon -ExcelFile $ExcelFile -SheetName $SheetName
    # پنل جمع
    $buttonY = $formHeight - $Config.FooterH

$sumPanel = New-SumPanel -yPos ($buttonY - $Config.SumH)

$total = if ($Soon -and $Soon.Count -gt 0) { (@($Soon) | ForEach-Object { [decimal]$_.Amount } | Measure-Object -Sum).Sum } else { [decimal]0 }

$lblSum = $sumPanel.Controls["lblSumAmount"]
$lblSum.Text = "{0:N0} ریال" -f $total
$lblSum.Tag = [decimal]$total
$script:SumLabel = $lblSum

$form.Controls.Add($sumPanel)
    # دکمه‌های پایین

    $btnClose                           = New-Object System.Windows.Forms.Button
    $btnClose.Text                      = $Config.CloseButtonText
    Set-UiButtonStyle `
        -Button $btnClose `
        -BackColor $Clr.BgCard `
        -ForeColor $Clr.White `
        -FontName 'SG Kara' `
        -FontSize 10
    $btnClose.Size                      = New-Object System.Drawing.Size(212, $Config.FooterH)
    $btnClose.Location                  = New-Object System.Drawing.Point(-2, $buttonY)
    Add-UiHoverEffect `
        -Control $btnClose `
        -HoverColor $Clr.DangerBtn `
        -NormalColor $Clr.BgCard

    $capturedForm   = $form
    $capturedWidget = $widget
    $btnClose.Add_Click({

    Invoke-FadeOut -Form $capturedForm

    $capturedForm.Hide()

}.GetNewClosure())
    $form.Controls.Add($btnClose)

    $capturedExcel2 = $ExcelFile
    $btnOpen                           = New-Object System.Windows.Forms.Button
    $btnOpen.Text                      = $Config.OpenExcelButtonText
    Set-UiButtonStyle `
        -Button $btnOpen `
        -BackColor $Clr.BgCard `
        -ForeColor $Clr.White `
        -FontName 'SG Kara' `
        -FontSize 10
    $btnOpen.Size                      = New-Object System.Drawing.Size(214, $Config.FooterH)
    $btnOpen.Location                  = New-Object System.Drawing.Point(210, $buttonY)
    Add-UiHoverEffect `
        -Control $btnOpen `
        -HoverColor $Clr.Accent `
        -NormalColor $Clr.BgCard
    $btnOpen.Add_Click({ Start-Process $capturedExcel2 }.GetNewClosure())
    $form.Controls.Add($btnOpen)

    # FadeIn + Shake هنگام اولین نمایش
    $capturedHasOverdue = $hasOverdue
    $capturedFormRef    = $form
    $form.Add_Shown({
        if (-not $capturedFormRef.Tag) {
            $capturedFormRef.Tag           = $true
            $capturedFormRef.ActiveControl = $null
            Invoke-FadeIn -Form $capturedFormRef -TargetOpacity $Config.MainOpacity
            if ($capturedHasOverdue.Count -gt 0) { Invoke-Shake -Form $capturedFormRef }
        }
    }.GetNewClosure())

    return $form
}
#  آیکون سیستم‌تری (NotifyIcon)
# ============================================================

# ساخت NotifyIcon و منوی Tray.
function New-TrayIcon {
param(
    [array]$Soon,
    [System.Windows.Forms.Form]$MainForm,
    $ExcelFile,
    $SheetName,
    $Screen
)

    $State = Get-TrayState -Soon $Soon
    $Info  = Get-TrayStateInfo -State $State

    # ساخت آیکون ۱۶x۱۶ با GDI+
    $icon = New-TrayStatusIcon -BgColor $Info.Color

    # NotifyIcon
    $tray                  = New-Object System.Windows.Forms.NotifyIcon
    $tray.Icon             = $icon
    $tray.Text             = $Config.TrayTip
    $tray.Visible          = $true
    $tray.BalloonTipTitle  = 'یادآور اقساط'
    $tray.BalloonTipText   = $Info.TipText
    $tray.BalloonTipIcon   = $Info.TipIcon

    # ── Context Menu ──
$menu = New-Object System.Windows.Forms.ContextMenuStrip

# نمایش لیست
$miShow = New-Object System.Windows.Forms.ToolStripMenuItem
$miShow.Text = '📋 نمایش لیست اقساط'
$miShow.Font = New-Object System.Drawing.Font('Tahoma',9,[System.Drawing.FontStyle]::Bold)
$menu.Items.Add($miShow) | Out-Null

# باز کردن اکسل
$miExcel = New-Object System.Windows.Forms.ToolStripMenuItem
$miExcel.Text = '📗 باز کردن فایل اکسل'
$menu.Items.Add($miExcel) | Out-Null

# رفرش
$miRefresh = New-Object System.Windows.Forms.ToolStripMenuItem
$miRefresh.Text = '↻ بروزرسانی'
$menu.Items.Add($miRefresh) | Out-Null

# جداکننده
$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null

# خروج
$miExit = New-Object System.Windows.Forms.ToolStripMenuItem
$miExit.Text = '✖ خروج'
$menu.Items.Add($miExit) | Out-Null

$tray.ContextMenuStrip = $menu

# اطلاعات موردنیاز
$capturedForm  = $MainForm
$capturedTray  = $tray
$capturedExcel = $ExcelFile
$capturedSheet = $SheetName

# کلیک چپ روی Tray
$tray.Add_MouseClick({

    param($s, $e)

    if ($e.Button -ne [System.Windows.Forms.MouseButtons]::Left) {
        return
    }

    # اگر MiniWidget در حال نمایش است
    if (
        $null -ne $global:Widget -and
        -not $global:Widget.IsDisposed -and
        $global:Widget.Visible
    ) {
        # ویجت را مخفی کن
        $global:Widget.Hide()

        # همان فرم اصلی متصل به برنامه را برگردان
        if ($null -ne $capturedForm -and -not $capturedForm.IsDisposed) {
            $capturedForm.Show()
            $capturedForm.WindowState = [System.Windows.Forms.FormWindowState]::Normal
            $capturedForm.BringToFront()
            $capturedForm.Activate()
            $capturedForm.Opacity = 0.88
        }

        return
    }

    # ویجت باز نیست → رفتار فعلی فرم
    if ($capturedForm.Visible) {

        Invoke-FadeOut -Form $capturedForm
        $capturedForm.Hide()

    }
    else {

        $capturedForm.Show()
        $capturedForm.WindowState = [System.Windows.Forms.FormWindowState]::Normal
        $capturedForm.BringToFront()
        $capturedForm.Activate()
        $capturedForm.Opacity = 0.88
    }

}.GetNewClosure())

    # منو: نمایش فرم
    $miShow.Add_Click({
        $capturedForm.Show()
        $capturedForm.BringToFront()
        $capturedForm.Opacity = 0.88
    }.GetNewClosure())

    # منو: رفرش
$miRefresh.Add_Click({

    Start-Sleep -Milliseconds 500

    # 1. خواندن مجدد اطلاعات از اکسل
    $newSoon = @(
        Get-DueSoon `
            -ExcelFile $capturedExcel `
            -SheetName $capturedSheet
    )

    # 2. پیدا کردن پنل کارت‌ها
    $cp = $capturedForm.Controls |
        Where-Object {
            $_.GetType().Name -eq 'Panel' -and
            $_.Top -eq $Config.HeaderH
        } |
        Select-Object -First 1

    # 3. بازسازی کامل ردیف‌ها
    if ($null -ne $cp) {
        Build-Cards `
            -Parent $cp `
            -Soon $newSoon `
            -ExcelFile $capturedExcel `
            -SheetName $capturedSheet
    }

    # 4. بروزرسانی وضعیت MiniWidget
    if ($null -ne $global:Widget -and -not $global:Widget.IsDisposed) {
        Update-MiniWidget `
            -Widget $global:Widget `
            -Soon $newSoon
    }

    # 5. بروزرسانی وضعیت Tray Icon
    Update-TrayIcon -Tray $capturedTray -Soon $newSoon
}.GetNewClosure())
# باز کردن اکسل
# ===============================
$miExcel.Add_Click({

    Start-Process $capturedExcel

}.GetNewClosure())
# خروج
# ===============================
    # منو: خروج
$miExit.Add_Click({

    $global:RealExit = $true
    $capturedTray.Visible = $false
    $capturedTray.Dispose()

    $capturedForm.Close()

}.GetNewClosure())
return $tray

}
#  نقطه ورود (Entry Point)
# ============================================================

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
Sync-SupabaseToExcel
$global:RealExit = $false

$soon = @(Get-DueSoon `
    -ExcelFile $Config.ExcelFile `
    -SheetName $Config.SheetName)
    $soon | Format-Table -AutoSize
    $soon.GetType().FullName
    $soon | ForEach-Object {

}

$trayState = "Blue"

foreach($loan in @($soon)){

    if([int]$loan.Days -lt 0){
        $trayState = "Red"
        break
    }

    if([int]$loan.Days -le 5){
        $trayState = "Yellow"
    }
}
#.Count -gt 0

$mainForm = New-MainForm `
    -Soon $soon `
    -ExcelFile $Config.ExcelFile `
    -SheetName $Config.SheetName `
    -Screen $screen
    $hasOverdue = @($soon | Where-Object { $_.Days -lt 0 })

#$script:Widget.Show()

$null = $mainForm.Handle
$mainForm.Visible = $false

$trayIcon = New-TrayIcon `
    -Soon $soon `
    -MainForm $mainForm `
    -ExcelFile $Config.ExcelFile `
    -SheetName $Config.SheetName `
    -Screen $screen
    $global:TrayIcon = $trayIcon

$capturedTray = $trayIcon

$mainForm.Add_FormClosing({

    param($s,$e)

    if(-not $global:RealExit){
        $e.Cancel = $true
        Invoke-FadeOut -Form $s
        $s.Hide()
    }

}.GetNewClosure())

if ($soon.Count -gt 0) {
    [System.Media.SystemSounds]::Exclamation.Play()
    $mainForm.Show()
}

[System.Windows.Forms.Application]::Run($mainForm)

if($trayIcon){
    $trayIcon.Visible = $false
    $trayIcon.Dispose()
}
# STAGE1 PLACEHOLDER
