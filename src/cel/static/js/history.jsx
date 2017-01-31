import {
    fetchAuth,
    getAPIBaseURL,
    isPositiveNumeric,
    NavbarTitle,
    SelectizeUtils,
    getCurrentLang
} from 'Utils'

import FileSaver from 'file-saver'

import {
    BootstrapTable,
    TableHeaderColumn
} from 'react-bootstrap-table'
import 'node_modules/react-bootstrap-table/dist/react-bootstrap-table.min.css'

import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

var ManagerHistoryPage = React.createClass({

    getInitialState() {

        return {
            login: window.config.userName,
            historyList: Array(),
            currentSolde: undefined,
            endDate: new Date().setMonth(new Date().getMonth()+1, 0),
            beginDate: new Date().setDate(1),
            
        }
    },

    getHistoryPDF() {
        var computePDFData = (blob) => {
            FileSaver.saveAs(blob, 'releve_compte_eusko.pdf')
        }
        var begin = new Date(this.state.beginDate).setHours(0, -new Date().getTimezoneOffset(), 0, 0)
        var end = new Date(this.state.endDate).setHours(24, 59, 59, 999)
        // Get PDF data
        var urlSummary = (getAPIBaseURL + "export-history-adherent-pdf/?begin=" + new Date(begin).toISOString() + "&end=" + new Date(end).toISOString())
        fetchAuth(urlSummary, 'get', computePDFData, null, null, 'application/pdf')
    },

    computeHistoryList(historyList) {
        try {
            if (historyList.result.pageItems) {
                var historyListData = historyList.result.pageItems
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
                    newItem.solde = Number(this.state.currentSolde.status.balance)
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
                    var begin = new Date(this.state.beginDate).setHours(0, -new Date().getTimezoneOffset(), 0, 0)
                    var end = new Date(this.state.endDate).setHours(24, 59, 59, 999)
                    // Get account history
                    var urlHistory = (getAPIBaseURL + "payments-available-history-adherent/?begin=" + new Date(begin).toISOString() + "&end=" + new Date(end).toISOString())
                    fetchAuth(urlHistory, 'get', this.computeHistoryList)
                }
            );
        }

        // Get account summary
        var urlSummary = getAPIBaseURL + "account-summary-adherents/"
        fetchAuth(urlSummary, 'get', computeHistoryData)
    },

    beginDateChange(date) {
        this.setState({beginDate: date});
        var computeHistoryData = (data) => {
            this.setState({currentSolde: data.result[0]},
                () => {
                    var begin = new Date(this.state.beginDate).setHours(0, -new Date().getTimezoneOffset(), 0, 0)
                    var end = new Date(this.state.endDate).setHours(24, 59, 59, 999)
                    // Get account history
                    if(this.state.endDate)
                    {
                        var urlHistory = (getAPIBaseURL + "payments-available-history-adherent/?begin=" + new Date(begin).toISOString() + "&end=" + new Date(end).toISOString())
                        fetchAuth(urlHistory, 'get', this.computeHistoryList)
                    }
                    else {
                        var urlHistory = (getAPIBaseURL + "payments-available-history-adherent/?begin=1&end=1")
                        fetchAuth(urlHistory, 'get', this.computeHistoryList)
                    }
                }
            );
        }

        // Get account summary
        var urlSummary = getAPIBaseURL + "account-summary-adherents/"
        fetchAuth(urlSummary, 'get', computeHistoryData)
    },

    endDateChange(date) {
        this.setState({endDate: date});
        var computeHistoryData = (data) => {
            var postData = {}
            postData.beginDate = this.state.beginDate
            postData.endDate = this.state.endDate
            this.setState({currentSolde: data.result[0]},
                () => {
                    var begin = new Date(this.state.beginDate).setHours(0, -new Date().getTimezoneOffset(), 0, 0)
                    var end = new Date(this.state.endDate).setHours(24, 59, 59, 999)
                    // Get account history
                    
                    var urlHistory = (getAPIBaseURL + "payments-available-history-adherent/?begin=" + new Date(begin).toISOString() + "&end=" + new Date(end).toISOString())
                    fetchAuth(urlHistory, 'get', this.computeHistoryList, postData)
                }
            );
        }

        // Get account summary
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
                <div className="col-md-offset-1 col-md-2 col-sm-4">
                    <label className="control-label col-md-12 solde-history-label">
                        {__("Solde") + ": "}
                        {currentSoldeLabel}
                    </label>
                </div>
            </div>
        )

        // History data table
        var dateFormatter = (cell, row) => {
            // Force moment i18n
            moment.locale(getCurrentLang)
            return moment(cell).format('LLLL')
        }

        var amountFormatter = (cell, row) => {
            // Cell is a string for now,
            // we need to cast it in a Number object to use the toFixed method.
            return Number(cell).toFixed(2)
        }

        var historyTable = (
            <BootstrapTable
             data={this.state.historyList} striped={true} hover={true} pagination={true}
             selectRow={{mode: 'none'}} tableContainerClass="react-bs-table-account-history"
             options={{noDataText: __("Pas d'historique à afficher."), hideSizePerPage: true, sizePerPage: 20}}
             >
                <TableHeaderColumn isKey={true} hidden={true} dataField="id">{__("ID")}</TableHeaderColumn>
                <TableHeaderColumn dataField="date" dataFormat={dateFormatter}>{__("Date")}</TableHeaderColumn>
                <TableHeaderColumn columnClassName="line-break" dataField="description">{__("Libellé")}</TableHeaderColumn>
                <TableHeaderColumn dataField="amount" dataFormat={amountFormatter}>{__("Montant")}</TableHeaderColumn>
                <TableHeaderColumn dataField="solde">{__("Solde")}</TableHeaderColumn>
            </BootstrapTable>
        )

        return (
            <div className="row">
                <div className="col-md-10">
                    {actionButtons}
                    <label for="dateSelectorBegin">Date de début :</label>
                    <DatePicker
                        name="dateSelectorBegin"
                        className="form-control"
                        selected={moment(this.state.beginDate)}
                        onChange={this.beginDateChange}
                        showYearDropdown 
                        locale="fr"
                    />
                    <label for="dateSelectorEnd">Date de fin :</label>
                    <DatePicker
                        name="dateSelectorEnd"
                        className="form-control"
                        selected={moment(this.state.endDate)}
                        onChange={this.endDateChange}
                        showYearDropdown 
                        locale="fr"
                    />
                    <div className="row margin-right">
                        <div className="col-md-12 col-md-offset-1">
                            {historyTable}
                        </div>
                    </div>
                </div>
                <input
                    name="submit"
                    data-eusko="profil-form-submit"
                    type="submit"
                    defaultValue={__("Exporter")}
                    className="btn btn-success col-sm-offset-2"
                    formNoValidate={true}
                    onClick={this.getHistoryPDF}
                />
            </div>
        );
    }
})

ReactDOM.render(
    <ManagerHistoryPage />,
    document.getElementById('history')
)

ReactDOM.render(
    <NavbarTitle title={__("Historique compte personnel")} />,
    document.getElementById('navbar-title')
)