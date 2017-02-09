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
    TableHeaderColumn
} from 'react-bootstrap-table'
import 'node_modules/react-bootstrap-table/dist/react-bootstrap-table.min.css'

import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
const {
    ToastContainer
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)


var ManagerHistoryPage = React.createClass({

    getInitialState() {

        return {
            login: window.config.userName,
            historyList: Array(),
            currentSolde: undefined,
            endDate: moment(),
            beginDate: moment().subtract(1,'month'),
            selectedValue: {
                label: "Mois précédent",
                value: "last_month"
            },
        }
    },

    getHistoryPDF() {
        var computePDFData = (blob) => {
            FileSaver.saveAs(blob, 'releve_compte_eusko.pdf')
        }
        // Get PDF data
        var urlSummary = (getAPIBaseURL + "export-history-adherent-pdf/?begin=" + 
            moment(this.state.beginDate).format("YYYY-MM-DD") + "&end=" + 
            moment(this.state.endDate).format("YYYY-MM-DD"))
        fetchAuth(urlSummary, 'get', computePDFData, null, null, 'application/pdf')
    },

    computeHistoryList(historyList) {
        try {
            if (historyList[0].result.pageItems) {
                var historyListData = historyList[0].result.pageItems
            }
            else {
                var historyListData = historyList
            }
        }
        catch (e) {
            var historyListData = historyList
        }

        var res = _.map(historyListData,
            (item, index, list) => {
                var newItem = item

                // Input data are strings,
                // we need to cast it in a Number object to use the toFixed method.
                if (index === 0)
                    newItem.solde = Number(historyList[1])
                else
                    newItem.solde = Number(list[index-1].solde) - Number(list[index-1].amount)

                newItem.solde = newItem.solde.toFixed(2)
                return newItem
            }
        )

        this.setState({historyList: res});
    },

    componentDidMount() {
        var computeHistoryData = (data) => {
            this.setState({currentSolde: data.result[0]},
                () => {
                    // Get account history
                    var urlHistory = (getAPIBaseURL + "payments-available-history-adherent/?begin=" + 
                        moment(this.state.beginDate).format("YYYY-MM-DD") + "&end=" + 
                        moment(this.state.endDate).format("YYYY-MM-DD"))
                    fetchAuth(urlHistory, 'get', this.computeHistoryList)
                }
            );
        }
        // Get account summary
        var urlSummary = getAPIBaseURL + "account-summary-adherents/"
        fetchAuth(urlSummary, 'get', computeHistoryData)
    },

    beginDateChange(date) {
        if (date <= this.state.endDate) {
            this.setState({beginDate: date});
            var computeHistoryData = (data) => {
                this.setState({currentSolde: data.result[0]},
                    () => {
                        // Get account history
                        var urlHistory = (getAPIBaseURL + "payments-available-history-adherent/?begin=" + 
                            moment(this.state.beginDate).format("YYYY-MM-DD") + "&end=" + 
                            moment(this.state.endDate).format("YYYY-MM-DD"))
                        fetchAuth(urlHistory, 'get', this.computeHistoryList)
                    }
                );
            }
            this.setState({selectedValue:  {
                label: "Autres",
                value: "custom"
            }})
            // Get account summary
            var urlSummary = getAPIBaseURL + "account-summary-adherents/"
            fetchAuth(urlSummary, 'get', computeHistoryData)
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
            this.setState({endDate: date});
            var computeHistoryData = (data) => {
                this.setState({currentSolde: data.result[0]},
                    () => {
                        // Get account history
                        var urlHistory = (getAPIBaseURL + "payments-available-history-adherent/?begin=" + 
                            moment(this.state.beginDate).format("YYYY-MM-DD") + "&end=" + 
                            moment(this.state.endDate).format("YYYY-MM-DD"))
                        fetchAuth(urlHistory, 'get', this.computeHistoryList)
                    }
                );
            }
            this.setState({selectedValue:  {
                label: "Autres",
                value: "custom"
            }})
            // Get account summary
            var urlSummary = getAPIBaseURL + "account-summary-adherents/"
            fetchAuth(urlSummary, 'get', computeHistoryData)
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
    DateOnValueChange(item) {
        var computeHistoryData = (data) => {
            this.setState({currentSolde: data.result[0]},
                () => {
                    // Get account history
                    var urlHistory = (getAPIBaseURL + "payments-available-history-adherent/?begin=" + 
                        moment(this.state.beginDate).format("YYYY-MM-DD") + "&end=" + 
                        moment(this.state.endDate).format("YYYY-MM-DD"))
                    fetchAuth(urlHistory, 'get', this.computeHistoryList)
                }
            )
        }
        if (item.value == 'day') {
            this.setState({beginDate: moment()})
            this.setState({endDate: moment()})
        }
        else if (item.value == 'this_week') {
            this.setState({beginDate: moment().subtract(1,'week')})
            this.setState({endDate: moment()})
        }
        else if (item.value == 'last_month') {
            this.setState({beginDate: moment().subtract(1,'month')})
            this.setState({endDate: moment()})
        }
        else if (item.value == '3_month') {
            this.setState({beginDate: moment().subtract(3,'month')})
            this.setState({endDate: moment()})
        }
        else if (item.value == '12_month') {
            this.setState({beginDate: moment().subtract(12,'month')})
            this.setState({endDate: moment()})
        }
        this.setState({selectedValue:  {
            label: item.label,
            value: item.value
        }})
        var urlSummary = getAPIBaseURL + "account-summary-adherents/"
        fetchAuth(urlSummary, 'get', computeHistoryData)
    },

    render() {
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

        var actionButtons = (
            <div className="row margin-bottom">
                    <label className="control-label solde-history-label">
                        {__("Solde du compte") + ": "}
                        {currentSoldeLabel}
                    </label>
            </div>
        )

        // History data table
        var dateFormatter = (cell, row) => {
            // Force moment i18n
            moment.locale(getCurrentLang)
            return moment(cell).format('LLLL')
        }

        var debitFormatter = (cell, row) => {
            // Cell is a string for now,
            // we need to cast it in a Number object to use the toFixed method.
            if (cell<0)
            {
                return Number(cell).toFixed(2)
            }
        }
        var creditFormatter = (cell, row) => {
            // Cell is a string for now,
            // we need to cast it in a Number object to use the toFixed method.
            if (cell>0)
            {
                return Number(cell).toFixed(2)
            }
        }

        var historyTable = (

            <BootstrapTable
             data={this.state.historyList} striped={true} hover={true} pagination={true}
             search={true} searchPlaceholder={__("Rechercher une opération")}
             selectRow={{mode: 'none'}} tableContainerClass="react-bs-table-account-history"
             options={{noDataText: __("Pas d'historique à afficher."), hideSizePerPage: true, sizePerPage: 20}}
             >
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
                <div className="col-md-12">
                    <div className="form-group row">
                        <div className="col-sm-1"></div>
                        <label
                            className="control-label col-sm-3"
                            htmlFor="memberhistorical-date-period">
                            {__("Période")}
                        </label>
                        <div className="col-sm-4 memberhistorical" data-eusko="memberhistorical-date-period">
                            <SimpleSelect
                                ref="select"
                                placeholder={__("Période")}
                                theme="bootstrap3"
                                onValueChange={this.DateOnValueChange}
                                value = {this.state.selectedValue}
                                required
                            >
                                <option value = "day">Aujourd'hui</option>
                                <option value = "this_week">Cette semaine</option>
                                <option value = "last_month">Mois précédent</option>
                                <option value = "3_month">Trois derniers mois</option>
                                <option value = "12_month">Douze derniers mois</option>
                                <option value = "custom">Autres</option>
                            </SimpleSelect>
                        </div>
                        <div className="col-sm-2"></div>
                    </div>
                    <div className="form-group row">
                        <div className="col-sm-1"></div>
                        <label className="control-label col-sm-3" for="memberhistorical-date-start-end">Date début / fin :</label>
                        <div className="col-sm-1 memberhistorical" data-eusko="memberhistorical-date-start">
                            <DatePicker
                                name="dateSelectorBegin"
                                className="form-control"
                                selected={moment(this.state.beginDate)}
                                onChange={this.beginDateChange}
                                showYearDropdown 
                                locale="fr"
                            />
                        </div>
                        <div className="col-sm-2"></div>
                        <div className="col-sm-1 memberhistorical" data-eusko="memberhistorical-date-end">
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
                    <div className="form-group row">
                        <div className="col-sm-9"></div>
                        <div className="col-sm-3">{actionButtons}</div>
                    </div>
                </div>
                <div className="col-md-10">
                    <div className="row margin-right">
                        <div className="col-md-12 col-md-offset-1">
                            {historyTable}
                        </div>
                    </div>
                </div>
                <input
                    name="submit"
                    data-eusko="memberhistorical-export"
                    type="submit"
                    defaultValue={__("Exporter")}
                    className="btn btn-success col-sm-offset-2"
                    formNoValidate={true}
                    onClick={this.getHistoryPDF}
                />
                <ToastContainer ref="container"
                    toastMessageFactory={ToastMessageFactory}
                    className="toast-top-right toast-top-right-navbar"
                />
            </div>
        );
    }
})

ReactDOM.render(
    <ManagerHistoryPage />,
    document.getElementById('history')
)