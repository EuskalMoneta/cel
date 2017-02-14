import {
    fetchAuth,
    getAPIBaseURL,
} from 'Utils'

import {
    BootstrapTable,
    TableHeaderColumn,
} from 'react-bootstrap-table'
import 'node_modules/react-bootstrap-table/dist/react-bootstrap-table.min.css'
import FileSaver from 'file-saver'
class AccountButtons extends React.Component {
    downloadReleveIdentite() {
        var computePDFData = (blob) => {
            FileSaver.saveAs(blob, 'releve_identite_eusko.pdf')
        }
        var urlRIE = (getAPIBaseURL + "export-rie-adherent/?account=" + "789953404")
        fetchAuth(urlRIE, 'get', computePDFData, null, null, 'application/pdf')
    }

    rechargerCompte() {
        debugger
        // window.location.assign()
    }

    reconvertirEusko() {
        debugger
        // window.location.assign()
    }

    render() {
        if (this.props.memberName.toUpperCase().startsWith('Z')) {
            return (
                <div>
                    <button
                        onClick={this.downloadReleveIdentite}
                        className="btn btn-default enable-pointer-events">{__("Télécharger le Relevé d'Identité Eusko")}</button>
                    {' '}
                    <button
                        onClick={this.rechargerCompte}
                        className="btn btn-default enable-pointer-events">{__("Recharger le compte")}</button>
                    {' '}
                    <button
                        onClick={this.reconvertirEusko}
                        className="btn btn-default enable-pointer-events">{__("Reconvertir des eusko en €")}</button>
                </div>
            )
        }
        else {
            return (
                <div>
                    <button
                        onClick={this.downloadReleveIdentite}
                        className="btn btn-default enable-pointer-events">{__("Télécharger le Relevé d'Identité Eusko")}</button>
                    {' '}
                    <button
                        onClick={this.rechargerCompte}
                        className="btn btn-default enable-pointer-events">{__("Recharger le compte")}</button>
                </div>
            )
        }
    }
}


var Overview = React.createClass({

     getInitialState() {
        return {
            accountList: Array(),
        }
    },

    computeAccountList(data) {
        // Get accountList
        var accountList = _.chain(data.result)
                           .map((item) => { return {number: item.number, active: item.active, memberName: window.config.userName,
                                                    solde: item.status.balance + " " + item.currency.suffix}
                            })
                           .sortBy((item) => { return item.number })
                           .sortBy((item) => { return item.active })
                           .value()

        this.setState({accountList: accountList})
    },

    componentDidMount() {
        fetchAuth(this.props.accountListUrl, this.props.method, this.computeAccountList)
    },

    render() {
        const selectRowProp = {
            mode: 'radio',
            clickToSelect: true,
            hideSelectColumn: true,
            onSelect: (row, isSelected, event) => {
                // We want to disable click on cell #2 (which starts at #0, remember ?)
                if (event.target.cellIndex == 2) {
                    return false
                }
                else {
                    // window.location.assign(this.props.bdcUrl + row.login)
                }
            }
        }

        var buttonFormatter = (cell, row) => {
            return (
                <AccountButtons memberName={ cell } />
            );
        }

        var accountListTable = (
            <BootstrapTable data={this.state.accountList} striped={true} hover={true} selectRow={selectRowProp}
                            tableContainerclassName="react-bs-table-list-account" options={{noDataText: __("Rien à afficher.")}}
            >
                <TableHeaderColumn isKey={true} dataField="number" width="250">{__("Numéro du compte")}</TableHeaderColumn>
                <TableHeaderColumn dataField="solde" width="250">{__("Solde")}</TableHeaderColumn>
                <TableHeaderColumn dataField="memberName"
                                   columnClassName="disable-pointer-events"
                                   dataFormat={buttonFormatter}>{__("Actions")}</TableHeaderColumn>
            </BootstrapTable>
        )

        return (
            <div className="row">
                <div className="col-md-10 col-md-offset-1">
                    {accountListTable}
                </div>
            </div>
        )
    }
})


ReactDOM.render(
    <Overview accountListUrl={getAPIBaseURL + "account-summary-adherents/"} bdcUrl="/bdc/manage/" method="GET" />,
    document.getElementById('overview')
)
document.title = __("Mon compte") + ": " + __("Synthèse") + " - " + __("Compte en ligne") + " " + document.title