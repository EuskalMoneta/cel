import {
    fetchAuth,
    getAPIBaseURL,
    isPositiveNumeric,
    SelectizeUtils,
    getCurrentLang
} from 'Utils'

import FileSaver from 'file-saver'

import ReactSelectize from 'react-selectize'
const SimpleSelect = ReactSelectize.SimpleSelect

import {
    BootstrapTable,
    TableHeaderColumn,
} from 'react-bootstrap-table'
import 'node_modules/react-bootstrap-table/dist/react-bootstrap-table.min.css'

const {
    Input,
    RadioGroup,
    Row,
    Textarea,
} = FRC

import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const {
    ToastContainer,
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)

const HistoricalForm = React.createClass({

    mixins: [FRC.ParentContextMixin],

    propTypes: {
        children: React.PropTypes.node
    },

    render() {
        return (
            <Formsy.Form
                className={this.getLayoutClassName()}
                {...this.props}
                ref="historical-form"
            >
                {this.props.children}
            </Formsy.Form>
        );
    }
})

var HistoryPage = React.createClass({

    getInitialState() {
        return {
            currentAccount: undefined,
            accountList: undefined,
            allAccount: undefined,
            login: window.config.userName,
            historyList: Array(),
            historyListWithSolde: Array(),
            currentSolde: undefined,
            endDate: moment(),
            beginDate: moment().subtract(1, 'month'),
            selectedValue: {
                label: "Le dernier mois",
                value: "last_month"
            },
            description: '',
        }
    },

    getHistoryPDF() {
        var computePDFData = (blob) => {
            FileSaver.saveAs(blob, 'releve_compte_eusko.pdf')
        }
        // Get PDF data
        var urlSummary = (getAPIBaseURL + "export-history-adherent/?begin=" + 
            moment(this.state.beginDate).format("YYYY-MM-DDThh:mm") + "&end=" + 
            moment(this.state.endDate).format("YYYY-MM-DDThh:mm") + "&description=" + this.state.description + "&mode=pdf")
        fetchAuth(urlSummary, 'get', computePDFData, null, null, 'application/pdf')
    },

    getHistoryCSV() {
        var computeCSVData = (blob) => {
            FileSaver.saveAs(blob, 'releve_compte_eusko.csv')
        }
        // Get PDF data
        var urlSummary = (getAPIBaseURL + "export-history-adherent/?begin=" +
            moment(this.state.beginDate).format("YYYY-MM-DDThh:mm") + "&end=" +
            moment(this.state.endDate).format("YYYY-MM-DDThh:mm") + "&description=" + this.state.description + "&mode=csv")
        fetchAuth(urlSummary, 'get', computeCSVData, null, null, 'text/csv')
    },

    computeHistoryListWithSolde(historyListWithSolde) {
        try {
            if (historyListWithSolde[0].result.pageItems) {
                var historyListData = historyListWithSolde[0].result.pageItems
            }
            else {
                var historyListData = historyListWithSolde
            }
        }
        catch (e) {
            var historyListData = historyListWithSolde
        }

        var res = _.map(historyListData,
            (item, index, list) => {
                var newItem = item

                // Input data are strings,
                // we need to cast it in a Number object to use the toFixed method.
                if (index === 0)
                    newItem.solde = Number(historyListWithSolde[1])
                else
                    newItem.solde = Number(list[index-1].solde) - Number(list[index-1].amount)

                newItem.solde = newItem.solde.toFixed(2)
                return newItem
            }
        )

        this.setState({historyListWithSolde: res}, this.getHistoryList)
    },

    getHistoryList(historyList) {
        var urlHistory = (getAPIBaseURL + "payments-available-history-adherent/?begin=" +
            moment(this.state.beginDate).format("YYYY-MM-DDThh:mm") + "&end=" +
            moment(this.state.endDate).format("YYYY-MM-DDThh:mm") + "&description=" + this.state.description + "&account=" + this.state.currentAccount.value)
        fetchAuth(urlHistory, 'get', this.computeHistoryList)
    },

    computeHistoryList(historyList) {
        for(var j=0; j < this.state.historyListWithSolde.length; j++)
        {
            for (var i=0; i < historyList[0].result.pageItems.length; i++)
            {

                if (historyList[0].result.pageItems[i].id == this.state.historyListWithSolde[j].id)
                {
                    historyList[0].result.pageItems[i].solde = this.state.historyListWithSolde[j].solde
                }
            }
        }

        // var res = _.each(historyList[0].result.pageItems, (item, index, list) => {
        // }, this.state.historyListWithSolde)

        this.setState({historyList: historyList[0].result.pageItems});
    },

    componentDidMount() {
        var computeHistoryData = (data) => {
            this.setState({allAccount: data.result});
            this.setState({currentSolde: data.result[0]}, this.refreshTable);
        }
        // Get account summary
        var urlSummary = getAPIBaseURL + "account-summary-adherents/"
        fetchAuth(urlSummary, 'get', computeHistoryData)

        var computeAccountList = (data) => {
            var res = _.chain(data.result)
                .map(function(item){ return {label: item.number, value:item.status.accountId} })
                .sortBy(function(item){ return item.label })
                .value()
            this.setState({accountList: res})
            this.setState({currentAccount:res[0]})
        }
        fetchAuth(urlSummary, 'GET', computeAccountList)


    },

    refreshTable() {
        var urlHistoryWithSolde = (getAPIBaseURL + "payments-available-history-adherent/?begin=" +
            moment(this.state.beginDate).format("YYYY-MM-DDThh:mm") + "&end=" +
            moment(this.state.endDate).format("YYYY-MM-DDThh:mm"))
        fetchAuth(urlHistoryWithSolde, 'get', this.computeHistoryListWithSolde)
    },

    beginDateChange(date) {
        if (date <= this.state.endDate)
        {
            this.setState({beginDate: date,
                           selectedValue:  {
                                label: "Autres",
                                value: "custom"
                           }
            }, this.refreshTable)
        }
        else {
            this.refs.container.error(
                __("Attention, la date de début doit être antérieur à celle de fin !"),
                "",
                {
                    timeOut: 5000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }
    },

    endDateChange(date) {
        if (date >= this.state.beginDate) {
            this.setState({endDate: date,
                           selectedValue:  {
                                label: "Autres",
                                value: "custom"
                          }
            }, this.refreshTable)
        }
        else {
            this.refs.container.error(
                __("Attention, la date de fin doit être postérieur à celle de début !"),
                "",
                {
                    timeOut: 5000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }
    },

    dateOnValueChange(item) {
        // We need to determine our beginDate
        switch (item.value) {
            case 'day':
                var beginDate = moment()
                break;
            case 'this_week':
                var beginDate = moment().subtract(1, 'week')
                break;
            case 'last_month':
                var beginDate = moment().subtract(1, 'month')
                break;
            case '3_month':
                var beginDate = moment().subtract(3, 'month')
                break;
            case '12_month':
                var beginDate = moment().subtract(12,'month')
                break;
        }

        this.setState({
            beginDate: beginDate,
            endDate: moment(),
            selectedValue: {
                label: item.label,
                value: item.value
            }
        }, this.refreshTable)
    },

    currentAccountOnValueChange(item) {
        this.setState({currentAccount: item.value});
    },

    descriptionOnValueChange(event, value) {
        this.setState({description: value}, this.refreshTable)
    },

    render() {
        const options = {
            noDataText: __("Pas d'historique à afficher."), 
            hideSizePerPage: true, 
            sizePerPage: 20,
        };

        // Display current solde information
        if (this.state.currentSolde || this.state.currentSolde === 0) {
            var currentSoldeLabel = (
                <span className="solde-history-span">
                    {this.state.currentSolde.status.balance + " " + this.state.currentSolde.currency.suffix}
                </span>
            )
        }
        else
            var currentSoldeLabel = null

        var balanceData = (
            <label className="control-label solde-history-label">
                {__("Solde") + ": "}
                {currentSoldeLabel}
            </label>
        )
        if (this.state.allAccount) {
            if (this.state.allAccount.length == 1 )
            {
                var accountData = (
                    <label className="control-label solde-history-label">
                        {__("Compte") + ": "}
                        {this.state.allAccount[0].number}
                    </label>
                )
            }
            else
            {
                var accountData = (
                    <div>
                    <label className="control-label solde-history-label">
                        {__("Compte") + ": "}
                    </label>
                    <SimpleSelect
                        ref="select"
                        theme="bootstrap3"
                        onValueChange={this.currentAccountOnValueChange}
                        value = {this.state.currentAccount}
                        options={this.state.accountList}
                        renderValue={SelectizeUtils.selectizeRenderValueLineBreak}
                        renderOption={SelectizeUtils.selectizeNewRenderOption}
                        required
                    >
                        <option value = "day">{this.state.allAccount[0].id}</option>
                    </SimpleSelect>
                    </div>
                )
            }
        }


        // History data table
        var dateFormatter = (cell, row) => {
            // Force moment i18n
            moment.locale(getCurrentLang)
            return moment(cell).format('LLLL')
        }

        var debitFormatter = (cell, row) => {
            // Cell is a string for now,
            // we need to cast it in a Number object to use the toFixed method.
            if (cell < 0)
            {
                return Number(cell).toFixed(2)
            }
        }
        var creditFormatter = (cell, row) => {
            // Cell is a string for now,
            // we need to cast it in a Number object to use the toFixed method.
            if (cell > 0)
            {
                return Number(cell).toFixed(2)
            }
        }

        var historyTable = (

            <BootstrapTable
             data={this.state.historyList} striped={true} hover={true} pagination={true}
             selectRow={{mode: 'none'}} tableContainerClass="react-bs-table-account-history"
             options={options}>
                <TableHeaderColumn isKey={true} hidden={true} dataField="id">{__("ID")}</TableHeaderColumn>
                <TableHeaderColumn dataField="date" dataFormat={dateFormatter}>{__("Date")}</TableHeaderColumn>
                <TableHeaderColumn columnClassName="line-break" dataField="description">{__("Libellé")}</TableHeaderColumn>
                <TableHeaderColumn dataField="amount" dataFormat={debitFormatter}>{__("Débit")}</TableHeaderColumn>
                <TableHeaderColumn dataField="amount" dataFormat={creditFormatter}>{__("Crédit")}</TableHeaderColumn>
                <TableHeaderColumn dataField="solde">{__("Solde")}</TableHeaderColumn>
            </BootstrapTable>
        )

        return (
            <div className="row">
                <div className="col-md-10">
                    <div className="form-group row">
                        <div className="col-sm-1"></div>
                        <div className="col-sm-3">{accountData}</div>
                    </div>
                    <div className="form-group row">
                        <div className="col-sm-1"></div>
                        <div className="col-sm-3">{balanceData}</div>
                    </div>
                    <div className="col-md-8 col-md-offset-1">
                        <div className="search-group" style={{borderRadius: 5}}>
                            <div className="form-group row">
                                <div className="col-sm-4 col-md-offset-1">
                                    <h4>Rechercher des opérations</h4>
                                </div>
                            </div>
                            <div className="form-group row col-md-offset-1" style={{marginBottom: 0}}>
                                <label
                                    className="control-label col-sm-1"
                                    htmlFor="memberhistorical-description"
                                    style={{paddingTop:10}}>
                                    {__("Description")}
                                </label>
                                <div className="col-sm-3">
                                    <HistoricalForm ref="historical-form">
                                        <Input
                                            name="description"
                                            data-eusko="memberhistorical-description"
                                            onChange={this.descriptionOnValueChange}
                                            value = {this.state.description}
                                        />
                                    </HistoricalForm>
                                </div>
                                <label
                                    className="control-label col-sm-2"
                                    htmlFor="memberhistorical-date-period"
                                    style={{paddingTop:10}}>
                                    {__("Période")}
                                </label>
                                <div className="col-sm-4 memberhistorical" data-eusko="memberhistorical-date-period">
                                    <SimpleSelect
                                        ref="select"
                                        placeholder={__("Période")}
                                        theme="bootstrap3"
                                        onValueChange={this.dateOnValueChange}
                                        value = {this.state.selectedValue}
                                        renderResetButton={() => { return null }}
                                        required
                                    >
                                        <option value = "day">Aujourd'hui</option>
                                        <option value = "this_week">La dernière semaine</option>
                                        <option value = "last_month">Le dernier mois</option>
                                        <option value = "3_month">Les 3 derniers mois</option>
                                        <option value = "12_month">Les 12 derniers mois</option>
                                        <option value = "custom">Autres</option>
                                    </SimpleSelect>
                                </div>
                                <div className="col-sm-2"></div>
                            </div>
                            <div className="form-group row col-md-offset-1" style={{marginBottom: 0}}>
                                <label className="control-label col-sm-2 col-md-offset-4" 
                                       htmlFor="memberhistorical-date-start-end" 
                                       style={{paddingTop:10}}>
                                            Date début / fin
                                </label>
                                <div className="col-sm-2 memberhistorical" data-eusko="memberhistorical-date-start">
                                    <DatePicker
                                        name="dateSelectorBegin"
                                        className="form-control"
                                        selected={moment(this.state.beginDate)}
                                        onChange={this.beginDateChange}
                                        showYearDropdown 
                                        locale="fr"
                                    />
                                </div>
                                <div className="col-sm-2 memberhistorical" data-eusko="memberhistorical-date-end">
                                    <DatePicker
                                        name="dateSelectorEnd"
                                        className="form-control"
                                        selected={moment(this.state.endDate)}
                                        onChange={this.endDateChange}
                                        showYearDropdown 
                                        locale="fr"
                                    />
                                </div>
                                <div className="col-sm-3"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="form-group row no-bottom-space">
                <div className="col-md-2 col-md-offset-9">
                    <input
                        name="submit"
                        data-eusko="memberhistorical-export"
                        type="submit"
                        defaultValue={__("Export PDF")}
                        className="btn btn-success margin-R10"
                        formNoValidate={true}
                        onClick={this.getHistoryPDF}
                    />
                    <input
                        name="submit"
                        data-eusko="memberhistorical-export"
                        type="submit"
                        defaultValue={__("Export CSV")}
                        className="btn btn-success "
                        formNoValidate={true}
                        onClick={this.getHistoryCSV}
                    />
                    </div>
                </div>
                <div className="col-md-10">
                    <div className="row margin-right">
                        <div className="col-md-12 col-md-offset-1">
                            {historyTable}
                        </div>
                    </div>
                </div>

                <ToastContainer ref="container"
                    toastMessageFactory={ToastMessageFactory}
                    className="toast-top-right toast-top-right-navbar"
                />
            </div>
        );
    }
})

ReactDOM.render(
    <HistoryPage />,
    document.getElementById('history')
)
document.title = __("Mon compte") + ": " + __("Historique") + " - " + __("Compte en ligne") + " " + document.title