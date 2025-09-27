function HTMLRepo(RequestedHTML) {

    console.log('RequestedHTML: ', RequestedHTML);
    if (RequestedHTML == "Header") {
        return "<head></head>";
    }
}


function CreateHeader(IncHTML, BGColor, HeaderHeightPx, HeaderLogoURL = 'nah', padheight, padWidth) {
    let ReturnHTML = '';
    let outerbox = '<div class="wsm_head_outer" style="background-color:' + BGColor + '; height: ' + HeaderHeightPx + 'px;">';
    let closerbox = '</div>';
    let PreParts_NoLogo = '<div class="wsm_head_only"><div style="padding: ' + padheight + 'px ' + padWidth + 'px">' + IncHTML + '</div></div>';
    let Prepartstable1_logo = '<div style="width:820px;"><div style="float:left; width:410px;"><div style="padding: ' + padheight + 'px ' + padWidth + 'px">' + IncHTML + '</div></div><div style="float:right; width:410px;"><div style="padding: ' + padheight + 'px ' + padWidth + 'px"><div class="wsm_head_logobox"></div></div></div></div>';

    ReturnHTML = outerbox + Prepartstable1_logo + closerbox;
    if (HeaderLogoURL == 'nah') {
        ReturnHTML = outerbox + PreParts_NoLogo + closerbox;
    }
    return ReturnHTML;
}

function CreateFooter(IncHTML, BGColor, FooterHeightPx) {
    return '<div class="wsm_foot_outer" style="background-color:' + BGColor + '; height: ' + FooterHeightPx + 'px;"><div class="wsm_foot_only"><div class="wsm_8pad_inner">' + IncHTML + '</div></div></div>';
}

function SectionClass(headerUsed, footerUsed) {
    let UsedSectionSizeClass = '';
    if (headerUsed == false && footerUsed == false) {
        UsedSectionSizeClass = 'wsm_baseSectionHeight_nohead_nofoot';
    }
    else if (headerUsed == true && footerUsed == false) {
        UsedSectionSizeClass = 'wsm_baseSectionHeight_yeshead_nofoot';
    }
    else if (headerUsed == false && footerUsed == true) {
        UsedSectionSizeClass = 'wsm_baseSectionHeight_nohead_yesfoot';
    }
    else if (headerUsed == true && footerUsed == true) {
        UsedSectionSizeClass = 'wsm_baseSectionHeight_yeshead_yesfoot';
    }
    else {
        UsedSectionSizeClass = 'wsm_error_section_size';
    }
    return UsedSectionSizeClass;
}

export { HTMLRepo, CreateHeader, CreateFooter, SectionClass };